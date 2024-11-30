// src/services/invoice.service.js
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Discount = require("../models/Discount");
const storeService = require("./store.service");
const {
  createHistoryRecord,
  mergeHistory,
} = require("../utils/historyHandler");
const { logAction } = require("../utils/logger");

const invoiceLog = logAction("Invoice");

class InvoiceService {
  constructor() {
    this.model = Invoice;
  }

  async getInvoices(query = {}, user) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        paymentStatus,
        customer,
        startDate,
        endDate,
        sortBy = "-createdAt",
      } = query;

      const startIndex = (page - 1) * limit;
      let queryObj = {};

      // Build query conditions
      if (status !== undefined) {
        queryObj.status = parseInt(status);
      }

      if (paymentStatus) {
        queryObj.paymentStatus = paymentStatus;
      }

      if (customer) {
        queryObj.customer = customer;
      }

      if (startDate && endDate) {
        queryObj.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const [total, invoices] = await Promise.all([
        this.model.countDocuments(queryObj),
        this.model
          .find(queryObj)
          .populate("customer", "name email phone")
          .populate("items.product", "name sku price")
          .populate("createdBy", "username")
          .sort(sortBy)
          .skip(startIndex)
          .limit(parseInt(limit)),
      ]);

      invoiceLog.success("Retrieved invoices list", {
        userId: user._id,
        query: queryObj,
      });

      return {
        count: invoices.length,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        data: invoices,
      };
    } catch (error) {
      invoiceLog.error("Failed to retrieve invoices", error);
      throw error;
    }
  }

  async create(data, user) {
    try {
      // Validate customer
      const customer = await Customer.findOne({
        _id: data.customer,
        status: 1,
      });
      if (!customer) {
        throw new Error("Customer not found or inactive");
      }

      // Process items
      const processedItems = await this.validateAndProcessItems(data.items);
      const subTotal = processedItems.reduce(
        (sum, item) => sum + item.subTotal,
        0
      );

      // Process discount if provided
      let discountInfo = null;
      if (data.discountCode) {
        discountInfo = await this.validateAndProcessDiscount(
          data.discountCode,
          subTotal
        );
      }

      // Calculate final total
      const total = discountInfo ? subTotal - discountInfo.amount : subTotal;

      // Create invoice
      const invoice = await this.model.create({
        invoiceNumber: await this.generateInvoiceNumber(),
        customer: customer._id,
        items: processedItems,
        subTotal,
        discount: discountInfo,
        total,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentMethod === "cash" ? "paid" : "pending",
        notes: data.notes,
        createdBy: user._id,
        updateHistory: [
          createHistoryRecord(
            user,
            {
              items: processedItems,
              discount: discountInfo,
              total,
            },
            "create"
          ),
        ],
      });

      // Update product quantities
      await this.updateProductQuantities(processedItems);

      // Update customer purchase history
      await this.updateCustomerPurchaseHistory(customer._id, invoice._id);

      // Update discount usage if applicable
      if (discountInfo) {
        await Discount.findByIdAndUpdate(discountInfo.discountId, {
          $inc: { usedCount: 1 },
        });
      }

      invoiceLog.success("Created invoice", {
        invoiceId: invoice._id,
        userId: user._id,
        customerId: customer._id,
        total,
        discountApplied: !!discountInfo,
      });

      return invoice;
    } catch (error) {
      invoiceLog.error("Failed to create invoice", error);
      throw error;
    }
  }

  async updatePaymentStatus(id, paymentStatus, user) {
    try {
      const invoice = await this.getInvoiceById(id);

      if (invoice.paymentStatus === "cancelled") {
        throw new Error("Cannot update cancelled invoice");
      }

      if (paymentStatus === "cancelled") {
        // Return products to inventory
        await this.returnProductsToInventory(invoice.items);

        // Revert discount usage if applicable
        if (invoice.discount?.discountId) {
          await Discount.findByIdAndUpdate(invoice.discount.discountId, {
            $inc: { usedCount: -1 },
          });
        }

        // Update customer purchase history
        await this.updateCustomerOnCancel(invoice);
      }

      const historyRecord = createHistoryRecord(
        user,
        {
          oldStatus: invoice.paymentStatus,
          newStatus: paymentStatus,
        },
        "payment_status_update"
      );

      const updateHistory = mergeHistory(invoice.updateHistory, historyRecord);

      const updatedInvoice = await this.model.findByIdAndUpdate(
        id,
        {
          paymentStatus,
          updateHistory,
        },
        { new: true }
      );

      invoiceLog.success("Updated invoice payment status", {
        invoiceId: id,
        userId: user._id,
        oldStatus: invoice.paymentStatus,
        newStatus: paymentStatus,
      });

      return updatedInvoice;
    } catch (error) {
      invoiceLog.error("Failed to update invoice payment status", error);
      throw error;
    }
  }

  // Helper methods
  async validateAndProcessItems(items) {
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findOne({
        _id: item.product,
        status: 1,
      });

      if (!product) {
        throw new Error(`Product not found or inactive: ${item.product}`);
      }

      if (item.quantity > product.quantity) {
        throw new Error(`Insufficient quantity for product: ${product.name}`);
      }

      const finalPrice = product.finalPrice || product.price;
      const subTotal = finalPrice * item.quantity;

      processedItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        finalPrice,
        subTotal,
      });
    }

    return processedItems;
  }

  async validateAndProcessDiscount(discountCode, orderValue) {
    if (!discountCode) return null;

    const discount = await Discount.findOne({
      code: discountCode.toUpperCase(),
      status: 1,
    });

    if (!discount) {
      throw new Error("Invalid discount code");
    }

    const isValid = await discount.isValid(orderValue);
    if (!isValid) {
      throw new Error("Discount code is not applicable to this order");
    }

    return {
      discountId: discount._id,
      code: discount.code,
      type: discount.type,
      value: discount.value,
      amount: discount.calculateDiscount(orderValue),
    };
  }

  async calculateTotals(items, discount = 0) {
    const subTotal = items.reduce((sum, item) => sum + item.subTotal, 0);
    const discountAmount = (subTotal * (discount || 0)) / 100;
    const total = subTotal - discountAmount;

    return { subTotal, discountAmount, total };
  }

  async generateInvoiceNumber() {
    const count = await this.model.countDocuments();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `INV${year}${month}${(count + 1).toString().padStart(6, "0")}`;
  }

  async generatePaymentQR(invoice) {
    try {
      if (invoice.paymentMethod !== "bank_transfer") {
        return null;
      }

      const store = await storeService.getStoreInfo();
      if (!store) {
        throw new Error("Store information not found");
      }

      const description = `Thanh toan hoa don ${invoice.invoiceNumber}`;

      // Tạo QR URL
      const qrCode = store.generateVietQRUrl(invoice.total, description);

      // Cập nhật bankTransferInfo
      await this.model.findByIdAndUpdate(invoice._id, {
        "bankTransferInfo.amount": invoice.total,
        "bankTransferInfo.description": description,
        "bankTransferInfo.qrCode": qrCode,
      });

      return {
        qrCode,
        amount: invoice.total,
        description,
        bankInfo: {
          bankId: store.bankInfo.bankId,
          accountNumber: store.bankInfo.accountNumber,
          accountName: store.bankInfo.accountName,
        },
      };
    } catch (error) {
      invoiceLog.error("Failed to generate payment QR", error, {
        invoiceId: invoice._id,
      });
      throw error;
    }
  }

  async getInvoiceById(id) {
    const invoice = await this.model
      .findById(id)
      .populate("customer", "name email phone")
      .populate("items.product", "name sku price")
      .populate("createdBy", "username")
      .populate("updateHistory.updatedBy", "username");

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    return invoice;
  }

  async updateProductQuantities(items) {
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: -item.quantity },
      });
    }
  }

  async returnProductsToInventory(items) {
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: item.quantity },
      });
    }
  }

  async updateCustomerPurchaseHistory(customerId, invoiceId) {
    await Customer.findByIdAndUpdate(customerId, {
      $push: { purchaseHistory: invoiceId },
      $inc: { totalPurchases: 1 },
      lastPurchaseDate: new Date(),
    });
  }

  async updateCustomerOnCancel(invoice) {
    await Customer.findByIdAndUpdate(invoice.customer, {
      $pull: { purchaseHistory: invoice._id },
      $inc: { totalPurchases: -1 },
    });
  }

  async getInvoiceStatistics(query = {}) {
    try {
      const { startDate, endDate } = query;
      let dateFilter = {};

      if (startDate && endDate) {
        dateFilter = {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        };
      }

      const baseMatch = {
        ...dateFilter,
        status: 1,
        paymentStatus: "paid",
      };

      // General statistics
      const stats = await this.model.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            totalInvoices: { $sum: 1 },
            totalRevenue: { $sum: "$total" },
            averageValue: { $avg: "$total" },
            minValue: { $min: "$total" },
            maxValue: { $max: "$total" },
          },
        },
      ]);

      // Payment methods distribution
      const paymentMethods = await this.model.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: "$paymentMethod",
            count: { $sum: 1 },
            total: { $sum: "$total" },
          },
        },
      ]);

      // Daily revenue
      const dailyRevenue = await this.model.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Top selling products
      const topProducts = await this.model.aggregate([
        { $match: baseMatch },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            totalQuantity: { $sum: "$items.quantity" },
            totalRevenue: {
              $sum: { $multiply: ["$items.finalPrice", "$items.quantity"] },
            },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $project: {
            name: "$product.name",
            sku: "$product.sku",
            totalQuantity: 1,
            totalRevenue: 1,
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
      ]);

      return {
        summary: stats[0] || {
          totalInvoices: 0,
          totalRevenue: 0,
          averageValue: 0,
          minValue: 0,
          maxValue: 0,
        },
        paymentMethods,
        dailyRevenue,
        topProducts,
      };
    } catch (error) {
      invoiceLog.error("Failed to get invoice statistics", error);
      throw error;
    }
  }

  async getCustomerInvoices(customerId, query = {}) {
    try {
      const { page = 1, limit = 10 } = query;
      const startIndex = (page - 1) * limit;

      // Verify customer exists
      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw new Error("Customer not found");
      }

      const [total, invoices] = await Promise.all([
        this.model.countDocuments({ customer: customerId }),
        this.model
          .find({ customer: customerId })
          .populate("items.product", "name sku price")
          .sort("-createdAt")
          .skip(startIndex)
          .limit(parseInt(limit)),
      ]);

      return {
        count: invoices.length,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        data: invoices,
      };
    } catch (error) {
      invoiceLog.error("Failed to get customer invoices", error);
      throw error;
    }
  }

  async generateInvoicePDF(id) {
    try {
      const invoice = await this.getInvoiceById(id);
      // Implement PDF generation logic here using a library like PDFKit
      // Return the PDF buffer or path
    } catch (error) {
      invoiceLog.error("Failed to generate invoice PDF", error);
      throw error;
    }
  }

  async exportInvoices(query = {}, format = "csv") {
    try {
      const invoices = await this.model
        .find(query)
        .populate("customer", "name email phone")
        .populate("items.product", "name sku");

      // Implement export logic based on format (CSV, Excel, etc.)
      // Return the exported file buffer or path
    } catch (error) {
      invoiceLog.error("Failed to export invoices", error);
      throw error;
    }
  }
}

module.exports = new InvoiceService();
