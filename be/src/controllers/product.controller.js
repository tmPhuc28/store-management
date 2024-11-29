// src/controllers/product.controller.js
const { validationResult } = require("express-validator");
const productService = require("../services/product.service");

class ProductController {
  async getProducts(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const result = await productService.getProducts(req.query, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProduct(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const product = await productService.getProductById(
        req.params.id,
        req.user
      );
      await product.populate([
        { path: "category", select: "name" },
        { path: "categoryPath", select: "name" },
        { path: "updateHistory.updatedBy", select: "username email" },
      ]);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      if (error.message === "Product not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async createProduct(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const product = await productService.create(req.body, req.user);
      await product.populate([
        { path: "category", select: "name" },
        { path: "categoryPath", select: "name" },
        { path: "updateHistory.updatedBy", select: "username email" },
      ]);

      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (error) {
      if (
        [
          "SKU already exists",
          "Category not found",
          "Category is inactive",
          "Products can only be assigned to leaf categories",
        ].includes(error.message)
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async updateProduct(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const product = await productService.update(
        req.params.id,
        req.body,
        req.user
      );
      await product.populate([
        { path: "category", select: "name" },
        { path: "categoryPath", select: "name" },
        { path: "updateHistory.updatedBy", select: "username email" },
      ]);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      if (error.message === "Product not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      if (
        [
          "SKU already exists",
          "Category not found",
          "Category is inactive",
          "Products can only be assigned to leaf categories",
        ].includes(error.message)
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async updateProductStatus(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const product = await productService.updateStatus(
        req.params.id,
        parseInt(req.body.status),
        req.user
      );

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      if (error.message === "Product not found") {
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

  async updateDiscount(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const product = await productService.updateDiscount(
        req.params.id,
        req.body,
        req.user
      );

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      if (error.message === "Product not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async removeDiscount(req, res, next) {
    try {
      const result = await productService.removeDiscount(
        req.params.id,
        req.user
      );
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (error.message === "Product not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async deleteProduct(req, res, next) {
    try {
      await productService.delete(req.params.id, req.user);
      res.status(200).json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      if (error.message === "Product not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      if (error.message.includes("Cannot delete product")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async updatePricesByCategory(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { categoryId } = req.params;
      const { adjustment, adjustmentType } = req.body;

      const result = await productService.updatePricesByCategory(
        categoryId,
        adjustment,
        adjustmentType,
        req.user
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error.message === "Category not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }
}

module.exports = new ProductController();
