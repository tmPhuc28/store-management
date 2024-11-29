// src/controllers/store.controller.js
const { validationResult } = require("express-validator");
const storeService = require("../services/store.service");

class StoreController {
  async getStoreInfo(req, res, next) {
    try {
      const store = await storeService.getStoreInfo();
      res.status(200).json({
        success: true,
        data: store,
      });
    } catch (error) {
      if (error.message === "Store information not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async createStore(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      // Kiểm tra xem đã có store chưa
      const existingStore = await storeService.getStoreInfo().catch(() => null);
      if (existingStore) {
        return res.status(400).json({
          success: false,
          message: "Store already exists. Use PUT to update.",
        });
      }

      const store = await storeService.updateStore(req.body, req.user);
      res.status(201).json({
        success: true,
        data: store,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStore(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const store = await storeService.updateStore(req.body, req.user);
      res.status(200).json({
        success: true,
        data: store,
      });
    } catch (error) {
      if (error.message === "Only one store document is allowed") {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async updateBusinessHours(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const store = await storeService.updateBusinessHours(req.body, req.user);
      res.status(200).json({
        success: true,
        data: store,
      });
    } catch (error) {
      if (error.message.includes("Invalid")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const store = await storeService.updateSettings(req.body, req.user);
      res.status(200).json({
        success: true,
        data: store,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StoreController();
