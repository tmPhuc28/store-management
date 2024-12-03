const BaseService = require("./base.service");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Discount = require("../models/Discount");
const StoreService = require("./store.service");
const BankService = require("./bank.service");
const VietQRService = require("./vietqr.service");
const {
  INVOICE_STATES,
  PAYMENT_METHODS,
  STATE_TRANSITIONS,
} = require("../constants/invoice.constants");
const {
  createHistoryRecord,
  mergeHistory,
} = require("../utils/historyHandler");
const { checkDuplicate } = require("../utils/duplicateCheck");

class InvoiceService extends BaseService {
  constructor() {
    super(Invoice, "Invoice");
    this.vietQRService = new VietQRService();
    this.bankService = new BankService();
    this.storeService = new StoreService();
    this.nullableFields = [
      "notes",
      "discount",
      "paymentInfo.notes",
      "paymentInfo.additionalData",
    ];
  }

  // ================ CRUD OPERATIONS ================

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

      const queryObj = this.buildQueryObject({
        status,
        paymentStatus,
        customer,
        startDate,
        endDate,
      });

      const [total, invoices] = await Promise.all([
        this.model.countDocuments(queryObj),
        this.model
          .find(queryObj)
          .populate("customer", "name email phone")
          .populate("items.product", "name sku price")
          .populate("createdBy", "username")
          .populate("updateHistory.updatedBy", "username")
          .sort(sortBy)
          .skip(startIndex)
          .limit(parseInt(limit)),
      ]);

      this.logger.success("Retrieved invoices list", {
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
      this.logger.error("Failed to retrieve invoices", error);
      throw error;
    }
  }

  async getInvoiceById(id, user) {
    try {
      const invoice = await this.model
        .findById(id)
        .populate("customer", "name email phone")
        .populate("items.product", "name sku price stock")
        .populate("createdBy", "username")
        .populate("updateHistory.updatedBy", "username");

      if (!invoice) {
        this.handleNotFound(id);
      }

      if (invoice.paymentMethod === PAYMENT_METHODS.BANK_TRANSFER) {
        await this.refreshPaymentQR(invoice);
      }

      return invoice;
    } catch (error) {
      this.logger.error("Failed to retrieve invoice", error);
      throw error;
    }
  }

  async create(data, user) {
    const session = await this.startTransaction();

    try {
      const normalizedData = await this.validateAndNormalize(data);

      // Process items and calculate totals
      const { items, subTotal } = await this.processItems(normalizedData.items);
      const total = await this.calculateTotal(
        subTotal,
        normalizedData.discount
      );

      // Process discount if exists
      if (normalizedData.discountCode) {
        normalizedData.discount = await this.processDiscount(
          normalizedData.discountCode,
          subTotal
        );
        normalizedData.total = this.calculateTotal(
          subTotal,
          normalizedData.discount
        );
      } else {
        normalizedData.total = subTotal;
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Create base invoice data
      const invoiceData = {
        ...normalizedData,
        invoiceNumber,
        items,
        subTotal,
        total,
        status: INVOICE_STATES.PENDING,
        createdBy: user._id,
      };

      // Setup payment info
      invoiceData.paymentInfo = await this.setupPaymentInfo(invoiceData);

      // Create history record
      invoiceData.updateHistory = [
        createHistoryRecord(user, invoiceData, "create"),
      ];

      // Create invoice
      const invoice = await this.model.create(invoiceData, { session });

      // Handle side effects
      await this.handleCreationEffects(invoice, session);

      await session.commitTransaction();

      this.logger.success("Created invoice", {
        invoiceId: invoice._id,
        userId: user._id,
        total: invoice.total,
      });

      return invoice;
    } catch (error) {
      await this.handleTransactionError(error, session, "Create invoice");
    }
  }

  // ================ VALIDATION & PROCESSING ================

  async checkDuplicates(data, invoiceId = null) {
    if (data.invoiceNumber) {
      await checkDuplicate(
        this.model,
        { invoiceNumber: data.invoiceNumber },
        invoiceId,
        "Invoice number already exists"
      );
    }
  }

  async validateData(data, invoiceId = null) {
    // 1. Validate customer
    await this.validateCustomer(data.customer);

    // 2. Validate items
    if (!data.items?.length) {
      throw new Error("Invoice must have at least one item");
    }
    await this.validateItems(data.items);

    // 3. Validate payment method
    if (!Object.values(PAYMENT_METHODS).includes(data.paymentMethod)) {
      throw new Error("Invalid payment method");
    }

    // 4. Validate payment info based on method
    if (data.paymentMethod === PAYMENT_METHODS.BANK_TRANSFER) {
      await this.bankService.validateBankInfo(data.bankTransferInfo);
    }

    // 5. Custom validations for specific states
    if (data.status) {
      await this.validateStateTransition(data.status, invoiceId);
    }
  }

  async validateCustomer(customerId) {
    const customer = await Customer.findOne({
      _id: customerId,
      status: 1,
    });

    if (!customer) {
      throw new Error("Customer not found or inactive");
    }

    return customer;
  }

  async validateItems(items) {
    for (const item of items) {
      const product = await Product.findOne({
        _id: item.product,
        status: 1,
      });

      if (!product) {
        throw new Error(`Product not found or inactive: ${item.product}`);
      }

      if (item.quantity > product.quantity) {
        throw new Error(
          `Insufficient stock for product ${product.name}. Available: ${product.quantity}`
        );
      }

      if (item.price !== product.price) {
        throw new Error(`Price mismatch for product ${product.name}`);
      }
    }
  }

  async validateStateTransition(newStatus, invoiceId) {
    if (!invoiceId) return; // Skip for new invoices

    const invoice = await this.model.findById(invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (!this.canTransitionTo(invoice.status, newStatus)) {
      throw new Error(
        `Cannot transition from ${invoice.status} to ${newStatus}`
      );
    }
  }

  async processItems(items) {
    const processedItems = [];
    let subTotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);

      const finalPrice = product.finalPrice || product.price;
      const itemSubTotal = finalPrice * item.quantity;

      processedItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        finalPrice,
        subTotal: itemSubTotal,
      });

      subTotal += itemSubTotal;
    }

    return { items: processedItems, subTotal };
  }

  async processDiscount(discountCode, subTotal) {
    const discount = await Discount.findOne({
      code: discountCode.toUpperCase(),
      status: 1,
    });

    if (!discount) {
      throw new Error("Invalid discount code");
    }

    // Validate discount
    const validationError = await this.validateDiscount(discount, subTotal);
    if (validationError) {
      throw new Error(validationError);
    }

    // Calculate discount amount
    const amount = this.calculateDiscountAmount(discount, subTotal);

    return {
      discountId: discount._id,
      code: discount.code,
      type: discount.type,
      value: discount.value,
      amount,
    };
  }

  // ================ STATE MANAGEMENT ================

  canTransitionTo(currentState, newState) {
    return STATE_TRANSITIONS[currentState]?.includes(newState) || false;
  }

  async updateStatus(id, newStatus, data, user) {
    const session = await this.startTransaction();

    try {
      const invoice = await this.getInvoiceById(id);

      // Validate state transition
      if (!this.canTransitionTo(invoice.status, newStatus)) {
        throw new Error(
          `Cannot transition from ${invoice.status} to ${newState}`
        );
      }

      // Handle state-specific logic
      const stateData = await this.handleStateChange(
        invoice,
        newStatus,
        data,
        user,
        session
      );

      // Update history
      const historyRecord = createHistoryRecord(
        user,
        { status: newStatus, ...stateData },
        "status_update"
      );
      const updateHistory = mergeHistory(invoice.updateHistory, historyRecord);

      // Update invoice
      const updatedInvoice = await this.model.findByIdAndUpdate(
        id,
        {
          status: newStatus,
          ...stateData,
          updateHistory,
        },
        { new: true, session }
      );

      await session.commitTransaction();

      this.logger.success("Updated invoice status", {
        invoiceId: id,
        oldStatus: invoice.status,
        newStatus,
        userId: user._id,
      });

      return updatedInvoice;
    } catch (error) {
      await this.handleTransactionError(error, session, "Update status");
    }
  }

  async handleStateChange(invoice, newStatus, data, user, session) {
    switch (newStatus) {
      case INVOICE_STATES.CONFIRMED:
        return this.handleConfirmation(invoice, data, user, session);
      case INVOICE_STATES.PAID:
        return this.handlePayment(invoice, data, user, session);
      case INVOICE_STATES.COMPLETED:
        return this.handleCompletion(invoice, data, user, session);
      case INVOICE_STATES.CANCELED:
        return this.handleCancellation(invoice, data, user, session);
      case INVOICE_STATES.REFUNDED:
        return this.handleRefund(invoice, data, user, session);
      default:
        throw new Error(`Unhandled state transition to ${newStatus}`);
    }
  }

  // ================ PAYMENT HANDLING ================

  /**
   * Setup payment information khi tạo invoice
   */
  async setupPaymentInfo(invoice) {
    try {
      if (invoice.paymentMethod === PAYMENT_METHODS.BANK_TRANSFER) {
        // Lấy thông tin bank từ store
        const storeBankInfo = await this.storeService.getStoreBankInfo();

        // Generate QR thông qua VietQRService
        const qrCode = await this.vietQRService.generateInvoiceQR(
          invoice,
          storeBankInfo
        );

        return {
          amount: invoice.total,
          bankTransfer: {
            qrCode,
            bankReference: `${invoice.invoiceNumber}`,
          },
        };
      }

      // Default payment info cho các phương thức khác
      return {
        amount: invoice.total,
      };
    } catch (error) {
      this.logger.error("Failed to setup payment info", error);
      throw new Error("Could not setup payment information");
    }
  }

  /**
   * Refresh QR code for pending bank transfers
   */
  async refreshPaymentQR(invoice) {
    try {
      if (
        invoice.paymentMethod === PAYMENT_METHODS.BANK_TRANSFER &&
        invoice.status === INVOICE_STATES.PENDING
      ) {
        const storeBankInfo = await this.storeService.getStoreBankInfo();
        const qrCode = await this.vietQRService.generateInvoiceQR(
          invoice,
          storeBankInfo
        );

        if (qrCode !== invoice.paymentInfo?.bankTransfer?.qrCode) {
          await this.model.updateOne(
            { _id: invoice._id },
            {
              "paymentInfo.bankTransfer.qrCode": qrCode,
              "paymentInfo.bankTransfer.updatedAt": new Date(),
            }
          );
        }
      }
    } catch (error) {
      this.logger.error("Failed to refresh payment QR", error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Validate payment data
   */
  async validatePaymentData(invoice, paymentData) {
    // Validate amount
    if (paymentData.amount && paymentData.amount !== invoice.total) {
      throw new Error("Payment amount must match invoice total");
    }

    // Additional validations based on payment method
    if (invoice.paymentMethod === PAYMENT_METHODS.BANK_TRANSFER) {
      if (!paymentData.transactionId) {
        throw new Error("Transaction ID is required for bank transfer");
      }

      // Validate transaction ID format
      if (!this.isValidTransactionId(paymentData.transactionId)) {
        throw new Error("Invalid transaction ID format");
      }
    }

    return true;
  }

  /**
   * Validate transaction ID format
   */
  isValidTransactionId(transactionId) {
    // Implement based on your bank's transaction ID format
    const transactionIdRegex = /^[A-Za-z0-9]{6,20}$/;
    return transactionIdRegex.test(transactionId);
  }

  /**
   * Process payment confirmation
   */
  async confirmPayment(id, paymentData, user) {
    const session = await this.startTransaction();

    try {
      const invoice = await this.getInvoiceById(id);

      // Validate payment state
      if (invoice.status !== INVOICE_STATES.CONFIRMED) {
        throw new Error("Invoice must be in CONFIRMED state for payment");
      }

      if (invoice.paymentInfo?.paidAmount >= invoice.total) {
        throw new Error("Invoice is already paid");
      }

      // Validate payment data
      await this.validatePaymentData(invoice, paymentData);

      // Process based on payment method
      const paymentInfo = await this.processPaymentByMethod(
        invoice,
        paymentData,
        user
      );

      // Update invoice
      const historyRecord = createHistoryRecord(
        user,
        { paymentInfo, status: INVOICE_STATES.PAID },
        "payment_confirmation"
      );
      const updateHistory = mergeHistory(invoice.updateHistory, historyRecord);

      const updatedInvoice = await this.model.findByIdAndUpdate(
        id,
        {
          status: INVOICE_STATES.PAID,
          paymentInfo,
          updateHistory,
        },
        { new: true, session }
      );

      await session.commitTransaction();

      this.logger.success("Payment confirmed", {
        invoiceId: id,
        userId: user._id,
        amount: paymentData.amount,
        method: invoice.paymentMethod,
      });

      return updatedInvoice;
    } catch (error) {
      await this.handleTransactionError(error, session, "Payment confirmation");
    }
  }

  /**
   * Process payment based on method
   */
  async processPaymentByMethod(invoice, paymentData, user) {
    const basePaymentInfo = {
      paidAmount: paymentData.amount || invoice.total,
      paidAt: new Date(),
      paidBy: user._id,
      notes: paymentData.notes,
    };

    if (invoice.paymentMethod === PAYMENT_METHODS.BANK_TRANSFER) {
      if (!paymentData.transactionId) {
        throw new Error("Transaction ID is required for bank transfer");
      }

      return {
        ...basePaymentInfo,
        bankTransfer: {
          ...(invoice.paymentInfo?.bankTransfer || {}),
          transactionId: paymentData.transactionId,
          confirmedAt: new Date(),
          confirmedBy: user._id,
        },
      };
    }

    // Cash or other payment methods
    return basePaymentInfo;
  }

  // ================ UTILITY METHODS ================

  buildQueryObject({ status, paymentStatus, customer, startDate, endDate }) {
    const queryObj = {};

    if (status !== undefined) {
      queryObj.status = status;
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

    return queryObj;
  }

  async generateInvoiceNumber() {
    const count = await this.model.countDocuments();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `INV${year}${month}${(count + 1).toString().padStart(6, "0")}`;
  }

  calculateDiscountAmount(discount, subTotal) {
    if (discount.type === "percentage") {
      let amount = (subTotal * discount.value) / 100;
      if (discount.maxDiscount) {
        amount = Math.min(amount, discount.maxDiscount);
      }
      return amount;
    }
    return discount.value;
  }

  calculateTotal(subTotal, discount = null) {
    if (!discount) return subTotal;
    return subTotal - discount.amount;
  }

  // ================ STATE HANDLERS ================

  async handleConfirmation(invoice, data, user, session) {
    try {
      // Validate required data
      if (!data.confirmedBy) {
        throw new Error("Confirmer information is required");
      }

      // Revalidate items availability
      await this.validateItems(invoice.items);

      return {
        confirmedAt: new Date(),
        confirmedBy: user._id,
        confirmationNotes: data.notes,
      };
    } catch (error) {
      this.logger.error("Confirmation failed", error);
      throw error;
    }
  }

  async handlePayment(invoice, data, user, session) {
    try {
      // Validate payment data based on method
      if (invoice.paymentMethod === PAYMENT_METHODS.BANK_TRANSFER) {
        if (!data.transactionId) {
          throw new Error(
            "Transaction ID is required for bank transfer payment"
          );
        }
      }

      // Validate payment amount
      if (data.paidAmount && data.paidAmount !== invoice.total) {
        throw new Error("Paid amount must match invoice total");
      }

      return {
        paymentInfo: {
          ...invoice.paymentInfo,
          paidAmount: data.paidAmount || invoice.total,
          paidAt: new Date(),
          paidBy: user._id,
          transactionId: data.transactionId,
          paymentNotes: data.notes,
        },
      };
    } catch (error) {
      this.logger.error("Payment handling failed", error);
      throw error;
    }
  }

  async handleCompletion(invoice, data, user, session) {
    try {
      if (invoice.status !== INVOICE_STATES.PAID) {
        throw new Error("Only paid invoices can be completed");
      }

      // Update customer statistics
      await this.updateCustomerStats(invoice.customer, session);

      return {
        completedAt: new Date(),
        completedBy: user._id,
        completionNotes: data.notes,
      };
    } catch (error) {
      this.logger.error("Completion failed", error);
      throw error;
    }
  }

  async handleCancellation(invoice, data, user, session) {
    try {
      if (!data.reason) {
        throw new Error("Cancellation reason is required");
      }

      // Restore product quantities
      await this.restoreProductQuantities(invoice.items, session);

      // Revert customer stats if needed
      if (invoice.status === INVOICE_STATES.COMPLETED) {
        await this.revertCustomerStats(
          invoice.customer,
          invoice.total,
          session
        );
      }

      // Revert discount usage if applicable
      if (invoice.discount?.discountId) {
        await this.revertDiscountUsage(invoice.discount.discountId, session);
      }

      return {
        canceledAt: new Date(),
        canceledBy: user._id,
        cancellationReason: data.reason,
        cancellationNotes: data.notes,
      };
    } catch (error) {
      this.logger.error("Cancellation failed", error);
      throw error;
    }
  }

  async handleRefund(invoice, data, user, session) {
    try {
      // Validate refund data
      if (!data.refundAmount || data.refundAmount > invoice.total) {
        throw new Error("Invalid refund amount");
      }

      if (!data.reason) {
        throw new Error("Refund reason is required");
      }

      if (!data.refundMethod) {
        throw new Error("Refund method is required");
      }

      // Xử lý refund từng phần
      if (data.items) {
        // Validate items cần refund
        await this.validateRefundItems(invoice.items, data.items);

        // Hoàn trả số lượng sản phẩm tương ứng
        await this.restorePartialProductQuantities(data.items, session);

        // Tính toán lại giá trị sau refund
        const refundAmount = this.calculateRefundAmount(data.items);
        if (refundAmount !== data.refundAmount) {
          throw new Error("Refund amount does not match items total");
        }
      } else {
        // Hoàn trả toàn bộ
        await this.restoreProductQuantities(invoice.items, session);
      }

      // Handle bank transfer refund
      if (data.refundMethod === "bank_transfer") {
        if (!data.bankInfo) {
          throw new Error("Bank information is required for transfer refund");
        }
        await this.bankService.validateBankInfo(data.bankInfo);
      }

      return {
        refundInfo: {
          amount: data.refundAmount,
          items: data.items,
          method: data.refundMethod,
          reason: data.reason,
          notes: data.notes,
          bankInfo: data.bankInfo,
          processedAt: new Date(),
          processedBy: user._id,
        },
      };
    } catch (error) {
      this.logger.error("Refund failed", error);
      throw error;
    }
  }

  // ================ SIDE EFFECTS HANDLERS ================

  async handleCreationEffects(invoice, session) {
    try {
      const updates = [];

      // 1. Update product quantities
      updates.push(
        ...invoice.items.map((item) =>
          Product.findByIdAndUpdate(
            item.product,
            { $inc: { quantity: -item.quantity } },
            { session }
          )
        )
      );

      // 2. Update customer history
      updates.push(
        Customer.findByIdAndUpdate(
          invoice.customer,
          {
            $push: { purchaseHistory: invoice._id },
            $inc: { totalPurchases: 1 },
            lastPurchaseDate: new Date(),
          },
          { session }
        )
      );

      // 3. Update discount usage if applicable
      if (invoice.discount?.discountId) {
        updates.push(
          Discount.findByIdAndUpdate(
            invoice.discount.discountId,
            { $inc: { usedCount: 1 } },
            { session }
          )
        );
      }

      await Promise.all(updates);
    } catch (error) {
      this.logger.error("Creation effects failed", error);
      throw error;
    }
  }

  async restoreProductQuantities(items, session) {
    try {
      await Promise.all(
        items.map((item) =>
          Product.findByIdAndUpdate(
            item.product,
            { $inc: { quantity: item.quantity } },
            { session }
          )
        )
      );
    } catch (error) {
      this.logger.error("Failed to restore product quantities", error);
      throw error;
    }
  }

  async updateCustomerStats(customerId, session) {
    try {
      const stats = await this.model.aggregate([
        {
          $match: {
            customer: customerId,
            status: INVOICE_STATES.COMPLETED,
          },
        },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: "$total" },
            count: { $sum: 1 },
            averageOrder: { $avg: "$total" },
            lastPurchase: { $max: "$completedAt" },
          },
        },
      ]);

      if (stats.length > 0) {
        await Customer.findByIdAndUpdate(
          customerId,
          {
            totalPurchases: stats[0].count,
            totalSpent: stats[0].totalSpent,
            averageOrderValue: stats[0].averageOrder,
            lastPurchaseDate: stats[0].lastPurchase,
          },
          { session }
        );
      }
    } catch (error) {
      this.logger.error("Failed to update customer stats", error);
      throw error;
    }
  }

  async revertCustomerStats(customerId, amount, session) {
    try {
      await Customer.findByIdAndUpdate(
        customerId,
        {
          $inc: {
            totalPurchases: -1,
            totalSpent: -amount,
          },
        },
        { session }
      );
    } catch (error) {
      this.logger.error("Failed to revert customer stats", error);
      throw error;
    }
  }

  async revertDiscountUsage(discountId, session) {
    try {
      await Discount.findByIdAndUpdate(
        discountId,
        { $inc: { usedCount: -1 } },
        { session }
      );
    } catch (error) {
      this.logger.error("Failed to revert discount usage", error);
      throw error;
    }
  }

  // Helper methods for partial refund
  async validateRefundItems(originalItems, refundItems) {
    for (const refundItem of refundItems) {
      const originalItem = originalItems.find(
        (item) => item.product.toString() === refundItem.product
      );

      if (!originalItem) {
        throw new Error(
          `Product ${refundItem.product} not found in original invoice`
        );
      }

      if (refundItem.quantity > originalItem.quantity) {
        throw new Error(
          `Cannot refund more than original quantity for product ${refundItem.product}`
        );
      }
    }
  }

  async restorePartialProductQuantities(items, session) {
    await Promise.all(
      items.map((item) =>
        Product.findByIdAndUpdate(
          item.product,
          { $inc: { quantity: item.quantity } },
          { session }
        )
      )
    );
  }

  calculateRefundAmount(items) {
    return items.reduce((total, item) => {
      const originalItem = this.invoice.items.find(
        (i) => i.product.toString() === item.product
      );
      return total + originalItem.finalPrice * item.quantity;
    }, 0);
  }

  // ================ REPORTING & STATISTICS ================

  async getDailyRevenue(startDate, endDate) {
    try {
      return await this.model.aggregate([
        {
          $match: {
            status: INVOICE_STATES.COMPLETED,
            completedAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$completedAt",
              },
            },
            revenue: { $sum: "$total" },
            count: { $sum: 1 },
            averageOrder: { $avg: "$total" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    } catch (error) {
      this.logger.error("Failed to get daily revenue", error);
      throw error;
    }
  }

  async getTopProducts(startDate, endDate, limit = 10) {
    try {
      return await this.model.aggregate([
        {
          $match: {
            status: INVOICE_STATES.COMPLETED,
            completedAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            totalQuantity: { $sum: "$items.quantity" },
            totalRevenue: {
              $sum: {
                $multiply: ["$items.price", "$items.quantity"],
              },
            },
            occurrences: { $sum: 1 },
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
            occurrences: 1,
            averageOrderQuantity: {
              $divide: ["$totalQuantity", "$occurrences"],
            },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: limit },
      ]);
    } catch (error) {
      this.logger.error("Failed to get top products", error);
      throw error;
    }
  }

  async getPaymentMethodStats(startDate, endDate) {
    try {
      return await this.model.aggregate([
        {
          $match: {
            status: INVOICE_STATES.COMPLETED,
            completedAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          },
        },
        {
          $group: {
            _id: "$paymentMethod",
            count: { $sum: 1 },
            total: { $sum: "$total" },
            average: { $avg: "$total" },
          },
        },
      ]);
    } catch (error) {
      this.logger.error("Failed to get payment method stats", error);
      throw error;
    }
  }

  async getInvoiceStatistics(query) {
    const { startDate, endDate, type = "daily" } = query;

    switch (type) {
      case "daily":
        return this.getDailyRevenue(startDate, endDate);
      case "monthly":
        return this.getMonthlyRevenue(startDate, endDate);
      case "payment_methods":
        return this.getPaymentMethodStats(startDate, endDate);
      case "top_products":
        return this.getTopProducts(startDate, endDate);
      default:
        throw new Error("Invalid statistics type");
    }
  }
}

module.exports = InvoiceService;
