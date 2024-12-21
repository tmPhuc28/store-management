// src/controllers/invoice.controller.js
const BaseController = require("./base/base.controller");
const InvoiceService = require("../services/invoice.service");
const ResponseHandler = require("../utils/responseHandler");

class InvoiceController extends BaseController {
  constructor() {
    super(InvoiceService);
  }

  /**
   * Create new invoice
   */
  create = async (req, res) => {
    try {
      this.validateRequest(req);

      const invoice = await this.service.create(req.body, req.user);

      const response = ResponseHandler.success(
        invoice,
        "Invoice created successfully",
        201
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Update invoice status
   */
  updateStatus = async (req, res) => {
    try {
      this.validateRequest(req);

      const invoice = await this.service.updateStatus(
        req.params.id,
        req.body.status,
        req.body,
        req.user
      );

      const response = ResponseHandler.success(
        invoice,
        "Invoice status updated successfully"
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Confirm invoice payment
   */
  confirmPayment = async (req, res) => {
    try {
      this.validateRequest(req);

      const invoice = await this.service.updateStatus(
        req.params.id,
        "paid",
        req.body,
        req.user
      );

      const response = ResponseHandler.success(
        invoice,
        "Payment confirmed successfully"
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Cancel invoice
   */
  cancelInvoice = async (req, res) => {
    try {
      this.validateRequest(req);

      const invoice = await this.service.updateStatus(
        req.params.id,
        "canceled",
        req.body,
        req.user
      );

      const response = ResponseHandler.success(
        invoice,
        "Invoice canceled successfully"
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Process refund
   */
  processRefund = async (req, res) => {
    try {
      this.validateRequest(req);

      const invoice = await this.service.updateStatus(
        req.params.id,
        "refunded",
        req.body,
        req.user
      );

      const response = ResponseHandler.success(
        invoice,
        "Refund processed successfully"
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Get invoice statistics
   */
  getStatistics = async (req, res) => {
    try {
      this.validateRequest(req);

      const stats = await this.service.getStatistics(req.query);

      const response = ResponseHandler.success(stats);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Get customer invoices
   */
  getCustomerInvoices = async (req, res) => {
    try {
      const { customerId } = req.params;
      const query = { ...req.query, customer: customerId };

      const result = await this.service.find(query);

      const response = ResponseHandler.success(result);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };
}

module.exports = InvoiceController;
