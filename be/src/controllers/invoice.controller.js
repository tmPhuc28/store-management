// src/controllers/invoice.controller.js
const { validationResult } = require("express-validator");
const invoiceService = require("../services/invoice.service");

class InvoiceController {
  async getInvoices(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const result = await invoiceService.getInvoices(req.query, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getInvoice(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const invoice = await invoiceService.getInvoiceById(req.params.id);
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
  }

  async createInvoice(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const invoice = await invoiceService.create(req.body, req.user);
      res.status(201).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("inactive") ||
        error.message.includes("Insufficient quantity")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async updatePaymentStatus(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const invoice = await invoiceService.updatePaymentStatus(
        req.params.id,
        req.body.paymentStatus,
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
      if (error.message.includes("Cannot update")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async getInvoiceStatistics(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const stats = await invoiceService.getInvoiceStatistics(req.query);
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCustomerInvoices(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const result = await invoiceService.getCustomerInvoices(
        req.params.customerId,
        req.query
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
  }

  async downloadInvoice(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const pdfBuffer = await invoiceService.generateInvoicePDF(req.params.id);

      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=invoice-${req.params.id}.pdf`,
        "Content-Length": pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (error) {
      if (error.message === "Invoice not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async exportInvoices(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const format = req.query.format || "csv";
      const fileBuffer = await invoiceService.exportInvoices(req.query, format);

      const contentType =
        format === "csv"
          ? "text/csv"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const extension = format === "csv" ? "csv" : "xlsx";

      res.set({
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename=invoices.${extension}`,
        "Content-Length": fileBuffer.length,
      });

      res.send(fileBuffer);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InvoiceController();
