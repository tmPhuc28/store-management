const { validationResult } = require("express-validator");
const InvoiceService = require("../services/invoice.service");
const { INVOICE_STATES } = require("../constants/invoice.constants");

class InvoiceController {
  constructor() {
    this.invoiceService = new InvoiceService();
  }

  // Get list of invoices
  getInvoices = async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const result = await this.invoiceService.getInvoices(req.query, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  // Get single invoice
  getInvoice = async (req, res, next) => {
    try {
      const invoice = await this.invoiceService.getInvoiceById(
        req.params.id,
        req.user
      );
      res.status(200).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      if (error.message === "Invoice not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  };

  // Create new invoice
  createInvoice = async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const invoice = await this.invoiceService.create(req.body, req.user);
      res.status(201).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("insufficient") ||
        error.message.includes("invalid")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  };

  // Update invoice status
  updateStatus = async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const invoice = await this.invoiceService.updateStatus(
        req.params.id,
        req.body.status,
        req.body,
        req.user
      );

      res.status(200).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      if (error.message.includes("Cannot transition")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  };

  // Confirm payment
  confirmPayment = async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const invoice = await this.invoiceService.confirmPayment(
        req.params.id,
        req.body,
        req.user
      );

      res.status(200).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      if (
        error.message.includes("must be in CONFIRMED state") ||
        error.message.includes("already paid") ||
        error.message.includes("Transaction ID")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  };

  // Get payment QR code
  getPaymentQR = async (req, res, next) => {
    try {
      const invoice = await this.invoiceService.getInvoiceById(
        req.params.id,
        req.user
      );

      if (invoice.status !== INVOICE_STATES.PENDING) {
        return res.status(400).json({
          success: false,
          message: "QR code only available for pending invoices",
        });
      }

      await this.invoiceService.refreshPaymentQR(invoice);

      res.status(200).json({
        success: true,
        data: {
          qrCode: invoice.paymentInfo?.bankTransfer?.qrCode,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // Get daily revenue statistics
  getDailyRevenue = async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const stats = await this.invoiceService.getDailyRevenue(
        req.query.startDate,
        req.query.endDate
      );

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  // Get top selling products
  getTopProducts = async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const stats = await this.invoiceService.getTopProducts(
        req.query.startDate,
        req.query.endDate,
        req.query.limit
      );

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  // Get payment method statistics
  getPaymentStats = async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const stats = await this.invoiceService.getPaymentMethodStats(
        req.query.startDate,
        req.query.endDate
      );

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
  // Xử lý hoàn tiền
  handleRefund = async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const invoice = await this.invoiceService.handleRefund(
        req.params.id,
        req.body,
        req.user
      );

      res.status(200).json({
        success: true,
        data: invoice,
        message: "Refund processed successfully",
      });
    } catch (error) {
      if (
        error.message.includes("Invalid refund amount") ||
        error.message.includes("Bank information required")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  };

  // Xem lịch sử hóa đơn của khách hàng
  getCustomerInvoices = async (req, res, next) => {
    try {
      const result = await this.invoiceService.getCustomerInvoices(
        req.params.customerId,
        req.query,
        req.user
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      if (error.message === "Customer not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  };

  // Xuất tổng hợp thống kê
  getInvoiceStatistics = async (req, res, next) => {
    try {
      const result = await this.invoiceService.getInvoiceStatistics(req.query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // Xem chi tiết lịch sử trạng thái
  getStatusHistory = async (req, res, next) => {
    try {
      const invoice = await this.invoiceService.getInvoiceById(req.params.id);
      res.status(200).json({
        success: true,
        data: invoice.statusHistory,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new InvoiceController();
