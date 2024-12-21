const BaseController = require("./base/base.controller");
const ProductLocationService = require("../services/productLocation.service");
const ResponseHandler = require("../utils/responseHandler");

class ProductLocationController extends BaseController {
  constructor() {
    super(ProductLocationService);
  }

  /**
   * Get warehouses list
   */
  getWarehouses = async (req, res) => {
    try {
      const warehouses = await this.service.getWarehouses();
      const response = ResponseHandler.success(warehouses);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Get areas by warehouse
   */
  getAreas = async (req, res) => {
    try {
      const areas = await this.service.getAreas(req.params.warehouse);
      const response = ResponseHandler.success(areas);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Get product locations summary
   */
  getProductLocationsSummary = async (req, res) => {
    try {
      const summary = await this.service.getProductLocationsSummary(
        req.params.productId
      );
      const response = ResponseHandler.success(summary);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };
}

module.exports = ProductLocationController;
