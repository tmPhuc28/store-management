// src/controllers/store.controller.js
const BaseController = require("./base/base.controller");
const StoreService = require("../services/store.service");
const ResponseHandler = require("../utils/responseHandler");

class StoreController extends BaseController {
  constructor() {
    super(StoreService);
  }

  /**
   * @desc    Get store information
   * @route   GET /api/v2/store
   */
  getStore = async (req, res) => {
    try {
      const store = await this.service.getStoreInfo();

      const response = ResponseHandler.success(store);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * @desc    Update store information
   * @route   PUT /api/v2/store
   */
  updateStore = async (req, res) => {
    try {
      this.validateRequest(req);

      const store = await this.service.updateStore(req.body, req.user);

      const response = ResponseHandler.success(
        store,
        "Store information updated successfully"
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * @desc    Get store bank information
   * @route   GET /api/v2/store/bank-info
   */
  getStoreBankInfo = async (req, res) => {
    try {
      const bankInfo = await this.service.getStoreBankInfo();

      const response = ResponseHandler.success(bankInfo);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * @desc    Update store bank information
   * @route   PUT /api/v2/store/bank-info
   */
  updateBankInfo = async (req, res) => {
    try {
      this.validateRequest(req);

      const bankInfo = await this.service.updateBankInfo(req.body, req.user);

      const response = ResponseHandler.success(
        bankInfo,
        "Bank information updated successfully"
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };
}

module.exports = StoreController;
