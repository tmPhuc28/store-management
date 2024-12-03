// src/controllers/store.controller.js
const { validationResult } = require("express-validator");
const StoreService = require("../services/store.service");

class StoreController {
  constructor() {
    this.storeService = new StoreService();
  }

  getStore = async (req, res, next) => {
    try {
      const store = await this.storeService.getStoreInfo();

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
  };

  updateStore = async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const store = await this.storeService.updateStore(req.body, req.user);

      res.status(200).json({
        success: true,
        data: store,
        message: "Store information updated successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  getStoreBankInfo = async (req, res, next) => {
    try {
      const bankInfo = await this.storeService.getStoreBankInfo();

      res.status(200).json({
        success: true,
        data: bankInfo,
      });
    } catch (error) {
      if (error.message === "Store bank information not configured") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  };

  updateBankInfo = async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const store = await this.storeService.updateBankInfo(req.body, req.user);
      res.status(200).json({
        success: true,
        data: store.bankInfo,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new StoreController();
