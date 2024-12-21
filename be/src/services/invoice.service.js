// src/services/invoice.service.js
const BaseService = require("./base/base.service");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const InvoiceDiscount = require("../models/InvoiceDiscount");
const {
  INVOICE_STATES,
  PAYMENT_METHODS,
} = require("../constants/invoice.constants");

class InvoiceService extends BaseService {
  constructor() {
    super(Invoice, "Invoice");
    this.nullableFields = ["notes", "discount"];
    this.useHistory = true;
    this.useTransactions = true;
    this.excludeFields = [...this.excludeFields];
  }

  getSearchFields() {
    return ["invoiceNumber"];
  }

  getPopulateConfig(view = "list") {
    const configs = {
      list: [
        { path: "customer", select: "name phone" },
        { path: "createdBy", select: "username" },
        { path: "items.product", select: "name code" },
      ],
      detail: [
        { path: "customer", select: "name phone email address" },
        { path: "items.product", select: "name code sku" },
        { path: "createdBy", select: "username email" },
        { path: "confirmedBy", select: "username" },
        { path: "completedBy", select: "username" },
        { path: "canceledBy", select: "username" },
        { path: "refundedBy", select: "username" },
        { path: "updateHistory.updatedBy", select: "username" },
      ],
    };
    return configs[view] || configs.list;
  }

  buildCustomQuery(params) {
    const query = {};

    if (params.status) {
      query.status = params.status;
    }

    if (params.customer) {
      query.customer = params.customer;
    }

    if (params.startDate || params.endDate) {
      query.createdAt = {};
      if (params.startDate) {
        query.createdAt.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        query.createdAt.$lte = new Date(params.endDate);
      }
    }

    if (params.minAmount) {
      query.total = { $gte: parseFloat(params.minAmount) };
    }

    if (params.maxAmount) {
      query.total = { ...query.total, $lte: parseFloat(params.maxAmount) };
    }

    if (params.paymentMethod) {
      query["payment.method"] = params.paymentMethod;
    }

    return query;
  }

  async create(data, user = null, options = {}) {
    const session = await this.startTransaction(options);

    try {
      // Validate customer
      const customer = await Customer.findOne({
        _id: data.customer,
        status: 1,
      }).session(session);

      if (!customer) {
        throw new Error("Customer not found or inactive");
      }

      // Process items
      const processedItems = await this.processItems(data.items, session);
      const subTotal = this.calculateSubTotal(processedItems);

      // Process discount if provided
      let discountInfo = null;
      if (data.discountCode) {
        discountInfo = await this.processDiscount(
          data.discountCode,
          subTotal,
          session
        );
      }

      // Calculate final total
      const total = this.calculateTotal(subTotal, discountInfo);

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Prepare invoice data
      const invoiceData = {
        invoiceNumber,
        customer: data.customer,
        items: processedItems,
        subTotal,
        discount: discountInfo,
        total,
        payment: {
          method: data.paymentMethod,
          amount: total,
        },
        notes: data.notes,
        createdBy: user._id,
      };

      // Create invoice
      const invoice = await super.create(invoiceData, user, {
        ...options,
        session,
      });

      // Update product quantities
      await this.updateProductQuantities(processedItems, session);

      // Increment discount usage if applied
      if (discountInfo) {
        await InvoiceDiscount.findOneAndUpdate(
          { code: discountInfo.code },
          { $inc: { usedCount: 1 } },
          { session }
        );
      }

      await this.endTransaction(session, true);
      return invoice;
    } catch (error) {
      await this.endTransaction(session, false);
      throw error;
    }
  }

  async processItems(items, session) {
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findOne({
        _id: item.product,
        status: 1,
      }).session(session);

      if (!product) {
        throw new Error(`Product not found or inactive: ${item.product}`);
      }

      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient quantity for product: ${product.name}`);
      }

      const itemData = {
        product: product._id,
        quantity: item.quantity,
        importPrice: product.importPrice,
        price: product.sellingPrice,
        finalPrice: product.currentPrice,
        subTotal: product.currentPrice * item.quantity,
      };

      // Add product's discount info if exists
      if (product.discount) {
        itemData.discount = {
          code: product.discount.code,
          type: product.discount.type,
          value: product.discount.value,
          amount: product.discount.amount,
        };
      }

      processedItems.push(itemData);
    }

    return processedItems;
  }

  calculateSubTotal(items) {
    return items.reduce((sum, item) => sum + item.subTotal, 0);
  }

  async processDiscount(code, subTotal, session) {
    const discount = await InvoiceDiscount.findOne({
      code: code.toUpperCase(),
      status: 1,
    }).session(session);

    if (!discount) {
      throw new Error("Invalid discount code");
    }

    if (!discount.isValidForOrder(subTotal)) {
      throw new Error(`Minimum order value is ${discount.minOrderValue}`);
    }

    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      throw new Error("Discount usage limit reached");
    }

    return {
      code: discount.code,
      type: discount.type,
      value: discount.value,
      amount: discount.calculateDiscount(subTotal),
    };
  }

  calculateTotal(subTotal, discount) {
    if (!discount) return subTotal;
    return subTotal - discount.amount;
  }

  async generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const count = (await this.model.countDocuments()) + 1;
    return `INV${year}${month}${count.toString().padStart(6, "0")}`;
  }

  async updateProductQuantities(items, session) {
    const updates = items.map((item) =>
      Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: -item.quantity } },
        { session }
      )
    );
    await Promise.all(updates);
  }

  async updateStatus(id, status, data, user) {
    const session = await this.startTransaction();
    try {
      const invoice = await this.getInvoiceById(id);

      // Validate status transition
      if (!invoice.canTransitionTo(status)) {
        throw new Error(
          `Invalid status transition from ${invoice.status} to ${status}`
        );
      }

      // Additional validation based on status
      await this.validateStatusTransition(invoice, status, data);

      // Update status with transaction
      const result = await super.update(id, { status, ...data }, user, {
        session,
      });

      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    }
  }

  async handleConfirmation(invoice, updateData, user) {
    updateData.confirmedBy = user._id;
    updateData.confirmedAt = new Date();
  }

  async handlePayment(invoice, updateData, data, user) {
    if (!invoice.payment) {
      throw new Error("Payment information not found");
    }

    // Validate payment amount
    const paidAmount = (invoice.payment.paidAmount || 0) + data.amount;
    if (paidAmount > invoice.total) {
      throw new Error("Payment amount exceeds invoice total");
    }

    // For bank transfer, require transaction ID
    if (invoice.payment.method === PAYMENT_METHODS.BANK_TRANSFER) {
      if (!data.transactionId) {
        throw new Error("Transaction ID is required for bank transfer");
      }
      updateData["payment.bankTransfer.transactionId"] = data.transactionId;
    }

    updateData["payment.paidAmount"] = paidAmount;
    updateData["payment.paidAt"] = new Date();
    updateData["payment.paidBy"] = user._id;
  }

  async handleCompletion(invoice, updateData, user) {
    if (!invoice.isPaid) {
      throw new Error("Cannot complete unpaid invoice");
    }

    updateData.completedBy = user._id;
    updateData.completedAt = new Date();
  }

  async handleCancellation(invoice, updateData, data, user, session) {
    if (!data.reason) {
      throw new Error("Cancellation reason is required");
    }

    // Restore product quantities
    await this.restoreProductQuantities(invoice.items, session);

    // Revert discount usage if applied
    if (invoice.discount) {
      await InvoiceDiscount.findOneAndUpdate(
        { code: invoice.discount.code },
        { $inc: { usedCount: -1 } },
        { session }
      );
    }

    updateData.canceledBy = user._id;
    updateData.canceledAt = new Date();
    updateData.cancelReason = data.reason;
  }

  async handleRefund(invoice, updateData, data, user, session) {
    if (!data.reason) {
      throw new Error("Refund reason is required");
    }

    if (!data.refundMethod) {
      throw new Error("Refund method is required");
    }

    // Handle bank transfer refund
    if (data.refundMethod === PAYMENT_METHODS.BANK_TRANSFER) {
      if (!data.bankInfo) {
        throw new Error("Bank information is required for refund");
      }
    }

    // Restore product quantities
    await this.restoreProductQuantities(invoice.items, session);

    updateData.refundedBy = user._id;
    updateData.refundedAt = new Date();
    updateData.refundReason = data.reason;
    updateData.refundMethod = data.refundMethod;
    updateData.refundBankInfo = data.bankInfo;
  }

  async restoreProductQuantities(items, session) {
    const updates = items.map((item) =>
      Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: item.quantity } },
        { session }
      )
    );
    await Promise.all(updates);
  }

  async getStatistics(query) {
    const { startDate, endDate, type = "daily" } = query;

    const matchStage = {
      status: INVOICE_STATES.COMPLETED,
      completedAt: {},
    };

    if (startDate) {
      matchStage.completedAt.$gte = new Date(startDate);
    }
    if (endDate) {
      matchStage.completedAt.$lte = new Date(endDate);
    }

    switch (type) {
      case "daily":
        return this.getDailyStats(matchStage);
      case "monthly":
        return this.getMonthlyStats(matchStage);
      case "payment_methods":
        return this.getPaymentMethodStats(matchStage);
      case "products":
        return this.getProductStats(matchStage);
      default:
        throw new Error("Invalid statistics type");
    }
  }

  async getDailyStats(matchStage) {
    return this.model.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$completedAt" },
          },
          invoiceCount: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
          totalProfit: { $sum: "$profit" },
          avgOrderValue: { $avg: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  // Có thể thêm các phương thức thống kê khác tương tự...
}

module.exports = new InvoiceService();
