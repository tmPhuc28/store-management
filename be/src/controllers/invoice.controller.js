// src/controllers/invoice.controller.js
const Invoice = require("../models/Invoice");
const invoiceService = require("../services/invoice.service");
const discountService = require("../services/discount.service");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger");
const QRCode = require("qrcode");

// @desc    Get all invoices
// @route   GET /api/v1/invoices
// @access  Private
exports.getInvoices = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const sortBy = req.query.sortBy || "-createdAt";
    const status =
      req.query.status !== undefined ? parseInt(req.query.status) : undefined;
    const paymentStatus = req.query.paymentStatus;
    const customer = req.query.customer;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    // Build query
    let query = {};

    if (status !== undefined && (status === 0 || status === 1)) {
      query.status = status;
    }
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
    if (customer) {
      query.customer = customer;
    }
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate("customer", "name email phone")
      .populate("items.product", "name sku price")
      .populate("createdBy", "username email")
      .sort(sortBy)
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: invoices.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single invoice
// @route   GET /api/v1/invoices/:id
// @access  Private
exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("customer", "name email phone address")
      .populate("items.product", "name sku price")
      .populate("createdBy", "username email")
      .populate("updateHistory.updatedBy", "username email");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create invoice
// @route   POST /api/v1/invoices
// @access  Private
exports.createInvoice = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Kiểm tra khách hàng
    const customer = await Customer.findOne({
      _id: req.body.customer,
      status: 1,
    });
    if (!customer) {
      return res.status(400).json({
        success: false,
        message: "Khách hàng không tồn tại hoặc không hoạt động",
      });
    }

    // Chuẩn bị và tính toán các items
    const preparedItems = [];
    let totalBeforeDiscount = 0;

    for (const item of req.body.items) {
      const product = await Product.findOne({
        _id: item.product,
        status: 1,
      });

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm không tồn tại hoặc không hoạt động: ${item.product}`,
        });
      }

      if (item.quantity > product.quantity) {
        return res.status(400).json({
          success: false,
          message: `Số lượng không đủ cho sản phẩm: ${product.name}`,
        });
      }

      // Kiểm tra và áp dụng giảm giá sản phẩm
      const productDiscount = await discountService.checkProductDiscount(
        product
      );
      const finalPrice = productDiscount.finalPrice;
      const itemSubTotal = finalPrice * item.quantity;

      preparedItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        discount: productDiscount.hasDiscount ? productDiscount.percentage : 0,
        finalPrice: finalPrice,
        subTotal: itemSubTotal,
      });

      totalBeforeDiscount += itemSubTotal;

      // Cập nhật số lượng sản phẩm
      await Product.findByIdAndUpdate(product._id, {
        $inc: { quantity: -item.quantity },
      });
    }

    // Xử lý mã giảm giá đơn hàng nếu có
    let appliedDiscount = {
      code: null,
      percentage: 0,
      amount: 0,
    };

    if (req.body.discountCode) {
      try {
        const discountInfo = await discountService.validateAndCalculateDiscount(
          req.body.discountCode,
          totalBeforeDiscount
        );

        appliedDiscount = {
          code: discountInfo.code,
          percentage:
            discountInfo.type === "percentage" ? discountInfo.value : 0,
          amount: discountInfo.discountAmount,
        };

        // Cập nhật số lần sử dụng mã giảm giá
        await discountService.incrementUsage(discountInfo.discountId);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    // Tính tổng tiền cuối cùng
    const total = totalBeforeDiscount - appliedDiscount.amount;

    // Tạo mã QR nếu thanh toán qua QR
    let qrCode = null;
    if (req.body.paymentMethod === "qr_code") {
      qrCode = await QRCode.toDataURL(
        JSON.stringify({
          invoiceId: new mongoose.Types.ObjectId(), // Tạo ID mới
          total: total,
          customer: customer._id,
          date: new Date(),
          items: preparedItems.length,
        })
      );
    }

    // Tạo hóa đơn
    const invoice = await Invoice.create({
      customer: customer._id,
      items: preparedItems,
      subTotal: totalBeforeDiscount,
      appliedDiscount,
      total,
      paymentMethod: req.body.paymentMethod,
      paymentStatus: req.body.paymentMethod === "cash" ? "paid" : "pending",
      qrCode,
      notes: req.body.notes,
      createdBy: req.user._id,
      updateHistory: [
        {
          updatedBy: req.user._id,
          changes: {
            type: "create",
            data: req.body,
          },
        },
      ],
    });

    // Cập nhật thông tin khách hàng
    await Customer.findByIdAndUpdate(customer._id, {
      $push: { purchaseHistory: invoice._id },
      $inc: { totalPurchases: 1 },
      lastPurchaseDate: new Date(),
    });

    logger.info(
      `Hóa đơn đã được tạo: ${invoice.invoiceNumber} bởi ${req.user.email}`
    );

    // Gửi response với thông tin chi tiết
    res.status(201).json({
      success: true,
      data: {
        ...invoice.toObject(),
        discountDetails: appliedDiscount.code
          ? {
              code: appliedDiscount.code,
              saved: appliedDiscount.amount,
              percentage: appliedDiscount.percentage,
            }
          : null,
        paymentInfo: {
          method: req.body.paymentMethod,
          status: invoice.paymentStatus,
          qrCode: qrCode ? true : false,
        },
      },
    });
  } catch (error) {
    // Rollback nếu có lỗi
    if (error.rollback && error.items) {
      for (const item of error.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { quantity: item.quantity },
        });
      }
    }
    next(error);
  }
};

// @desc    Update payment status
// @route   PATCH /api/v1/invoices/:id/payment-status
// @access  Private
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatus } = req.body;
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hóa đơn",
      });
    }

    // Kiểm tra trạng thái hợp lệ
    if (invoice.paymentStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Không thể cập nhật hóa đơn đã hủy",
      });
    }

    if (paymentStatus === "cancelled") {
      // Hoàn lại số lượng sản phẩm
      for (const item of invoice.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { quantity: item.quantity },
        });
      }

      // Giảm số lần mua của khách hàng
      await Customer.findByIdAndUpdate(invoice.customer, {
        $inc: { totalPurchases: -1 },
      });

      // Nếu đã sử dụng mã giảm giá, giảm số lần sử dụng
      if (invoice.appliedDiscount && invoice.appliedDiscount.code) {
        await discountService.decrementUsage(invoice.appliedDiscount.code);
      }
    }

    // Cập nhật trạng thái
    invoice.paymentStatus = paymentStatus;
    invoice.updateHistory.push({
      updatedBy: req.user._id,
      changes: {
        type: "payment_status",
        from: invoice.paymentStatus,
        to: paymentStatus,
      },
    });

    await invoice.save();

    logger.info(
      `Trạng thái thanh toán đã được cập nhật: ${invoice.invoiceNumber} thành ${paymentStatus} bởi ${req.user.email}`
    );

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel invoice
// @route   PATCH /api/v1/invoices/:id/cancel
// @access  Private
exports.cancelInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (invoice.paymentStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Invoice is already cancelled",
      });
    }

    // Return products to inventory
    for (const item of invoice.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: item.quantity },
      });
    }

    // Update invoice status
    invoice.paymentStatus = "cancelled";
    invoice.status = 0; // inactive
    invoice.updateHistory.push({
      updatedBy: req.user._id,
      changes: { paymentStatus: "cancelled", status: 0 },
    });

    await invoice.save();

    logger.info(
      `Invoice cancelled: ${invoice.invoiceNumber} by ${req.user.email}`
    );

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get invoice statistics
// @route   GET /api/v1/invoices/statistics
// @access  Private
exports.getInvoiceStatistics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }

    const stats = await Invoice.aggregate([
      {
        $match: {
          ...dateFilter,
          status: 1,
          paymentStatus: "paid",
        },
      },
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

    // Get payment method distribution
    const paymentMethods = await Invoice.aggregate([
      {
        $match: {
          ...dateFilter,
          status: 1,
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          total: { $sum: "$total" },
        },
      },
    ]);

    // Get daily revenue for the period
    const dailyRevenue = await Invoice.aggregate([
      {
        $match: {
          ...dateFilter,
          status: 1,
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: stats[0] || {
          totalInvoices: 0,
          totalRevenue: 0,
          averageValue: 0,
          minValue: 0,
          maxValue: 0,
        },
        paymentMethods,
        dailyRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer invoice history
// @route   GET /api/v1/invoices/customer/:customerId
// @access  Private
exports.getCustomerInvoices = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const customer = await Customer.findById(req.params.customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const total = await Invoice.countDocuments({
      customer: req.params.customerId,
    });
    const invoices = await Invoice.find({ customer: req.params.customerId })
      .populate("items.product", "name sku price")
      .sort("-createdAt")
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: invoices.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
