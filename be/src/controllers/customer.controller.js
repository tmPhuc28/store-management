// src/controllers/customer.controller.js
const { validationResult } = require("express-validator");
const customerService = require("../services/customer.service");

class CustomerController {
  async getCustomers(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const result = await customerService.getCustomers(req.query, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCustomer(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const customer = await customerService.getCustomerById(
        req.params.id,
        req.user
      );

      res.status(200).json({
        success: true,
        data: customer,
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

  async createCustomer(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const customer = await customerService.create(req.body, req.user);

      res.status(201).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      if (error.message.includes("already registered")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async updateCustomer(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const customer = await customerService.update(
        req.params.id,
        req.body,
        req.user
      );

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      if (error.message === "Customer not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      if (error.message.includes("already registered")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async updateCustomerStatus(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const customer = await customerService.updateStatus(
        req.params.id,
        parseInt(req.body.status),
        req.user
      );

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      if (error.message === "Customer not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      if (error.message.includes("Status must be")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async deleteCustomer(req, res, next) {
    try {
      await customerService.delete(req.params.id, req.user);

      res.status(200).json({
        success: true,
        message: "Customer deleted successfully",
      });
    } catch (error) {
      if (error.message === "Customer not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      if (error.message.includes("Cannot delete customer")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async getCustomerStatistics(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const stats = await customerService.getCustomerStatistics(
        req.params.id,
        req.user
      );

      res.status(200).json({
        success: true,
        data: stats,
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
}

module.exports = new CustomerController();
