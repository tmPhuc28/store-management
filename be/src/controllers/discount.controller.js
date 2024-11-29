// src/controllers/discount.controller.js
const { validationResult } = require("express-validator");
const discountService = require("../services/discount.service");

class DiscountController {
  async getDiscounts(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const result = await discountService.getDiscounts(req.query, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async validateDiscount(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const result = await discountService.validateDiscount(
        req.body.code,
        req.body.orderValue
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("expired") ||
        error.message.includes("usage limit") ||
        error.message.includes("must be at least")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async createDiscount(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const discount = await discountService.create(req.body, req.user);

      res.status(201).json({
        success: true,
        data: discount,
      });
    } catch (error) {
      if (
        error.message.includes("already exists") ||
        error.message.includes("must be") ||
        error.message.includes("cannot be")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async updateDiscount(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const discount = await discountService.update(
        req.params.id,
        req.body,
        req.user
      );

      res.status(200).json({
        success: true,
        data: discount,
      });
    } catch (error) {
      if (error.message === "Discount not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      if (
        error.message.includes("already exists") ||
        error.message.includes("must be") ||
        error.message.includes("cannot be")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async updateDiscountStatus(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const discount = await discountService.updateStatus(
        req.params.id,
        parseInt(req.body.status),
        req.user
      );

      res.status(200).json({
        success: true,
        data: discount,
      });
    } catch (error) {
      if (error.message === "Discount not found") {
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

  async deleteDiscount(req, res, next) {
    try {
      await discountService.delete(req.params.id, req.user);

      res.status(200).json({
        success: true,
        message: "Discount deleted successfully",
      });
    } catch (error) {
      if (error.message === "Discount not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      if (error.message.includes("Cannot delete")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async getDiscountStatistics(req, res, next) {
    try {
      const stats = await discountService.getDiscountStatistics(req.query);
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DiscountController();
