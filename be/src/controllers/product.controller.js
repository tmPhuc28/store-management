// src/controllers/product.controller.js
const BaseController = require("./base/base.controller");
const ProductService = require("../services/product.service");
const ResponseHandler = require("../utils/responseHandler");

class ProductController extends BaseController {
  constructor() {
    super(ProductService);
  }

  /**
   * Apply discount code to product
   */
  applyDiscountCode = async (req, res) => {
    try {
      this.validateRequest(req);

      const product = await this.service.applyDiscountCode(
        req.params.id,
        req.body.code,
        req.user
      );

      const response = ResponseHandler.success(
        product,
        "Discount code applied successfully"
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Remove discount from product
   */
  removeDiscount = async (req, res) => {
    try {
      const product = await this.service.removeDiscount(
        req.params.id,
        req.user
      );

      const response = ResponseHandler.success(
        product,
        "Discount removed successfully"
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Update product prices
   */
  updatePrices = async (req, res) => {
    try {
      this.validateRequest(req);

      const updatedData = {
        importPrice: req.body.importPrice,
        sellingPrice: req.body.sellingPrice,
      };

      const product = await this.service.update(
        req.params.id,
        updatedData,
        req.user
      );

      const response = ResponseHandler.success(
        product,
        "Product prices updated successfully"
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Update product quantity
   */
  updateQuantity = async (req, res) => {
    try {
      this.validateRequest(req);

      const product = await this.service.update(
        req.params.id,
        { quantity: req.body.quantity },
        req.user
      );

      const response = ResponseHandler.success(
        product,
        "Product quantity updated successfully"
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Discontinue product
   */
  discontinue = async (req, res) => {
    try {
      this.validateRequest(req);

      const product = await this.service.discontinue(
        req.params.id,
        req.body,
        req.user
      );

      const response = ResponseHandler.success(
        product,
        "Product discontinued successfully"
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Adjust product quantity
   */
  adjustQuantity = async (req, res) => {
    try {
      this.validateRequest(req);

      const product = await this.service.adjustQuantity(
        req.params.id,
        req.body,
        req.user
      );

      const response = ResponseHandler.success(
        product,
        "Quantity adjusted successfully"
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Get product location summary
   */
  getLocationSummary = async (req, res) => {
    try {
      const summary = await this.service.getLocationSummary(req.params.id);

      const response = ResponseHandler.success(summary);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };
}

module.exports = ProductController;
