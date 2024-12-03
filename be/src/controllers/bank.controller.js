// src/controllers/bank.controller.js
const { validationResult } = require("express-validator");
const BankService = require("../services/bank.service");
const VietQRService = require("../services/vietqr.service");

class BankController {
  constructor() {
    this.bankService = new BankService();
    this.vietQRService = new VietQRService();
  }

  getBanks = async (req, res, next) => {
    try {
      const onlySupported = req.query.onlySupported !== "false";
      const banks = await this.bankService.getBanks(onlySupported);

      res.json({
        success: true,
        count: banks.length,
        data: banks,
      });
    } catch (error) {
      next(error);
    }
  };

  findBank = async (req, res, next) => {
    try {
      const { identifier } = req.query;

      // Kiểm tra nếu không có identifier
      if (!identifier) {
        return res.status(400).json({
          success: false,
          message: "Identifier is required",
        });
      }

      // Tìm ngân hàng
      const bank = this.bankService.findBank(identifier);

      // Trả về kết quả thành công
      res.json({
        success: true,
        data: bank,
      });
    } catch (error) {
      next(error);
    }
  };

  generateQR = async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const qrUrl = await this.vietQRService.generateQRUrl(req.body);

      res.json({
        success: true,
        data: {
          qrCode: qrUrl,
        },
      });
    } catch (error) {
      if (error.message.includes("validation")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  };
}

module.exports = new BankController();
