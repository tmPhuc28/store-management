// src/controllers/payment.controller.js
const BaseController = require("./base/base.controller");
const PaymentService = require("../services/payment.service");
const ResponseHandler = require("../utils/responseHandler");

class PaymentController extends BaseController {
  constructor() {
    super(PaymentService);
  }

  /**
   * @desc    Get list of supported banks
   * @route   GET /api/v2/payments/banks
   */
  getBanks = async (req, res) => {
    try {
      const { onlySupported = true } = req.query;
      const banks = await this.service.getBanks(onlySupported === "true");

      const response = ResponseHandler.success(
        banks,
        "Banks retrieved successfully"
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * @desc    Find bank by identifier
   * @route   GET /api/v2/payments/banks/find
   */
  findBank = async (req, res) => {
    try {
      const { identifier } = req.query;

      if (!identifier) {
        throw new Error("Identifier is required");
      }

      const bank = await this.service.findBank(identifier);

      const response = ResponseHandler.success(bank);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * @desc    Generate QR code for payment
   * @route   POST /api/v2/payments/qr
   */
  generateQR = async (req, res) => {
    try {
      this.validateRequest(req);

      const qrUrl = await this.service.generateQRUrl(req.body);

      const response = ResponseHandler.success({
        qrCode: qrUrl,
      });
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * @desc    Validate QR URL
   * @route   POST /api/v2/payments/qr/validate
   */
  validateQR = async (req, res) => {
    try {
      this.validateRequest(req);

      const isValid = await this.service.validateQRUrl(req.body.url);

      const response = ResponseHandler.success({
        isValid,
      });
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };
}

module.exports = PaymentController;
