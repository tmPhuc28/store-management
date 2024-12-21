// src/controllers/customer.controller.js
const BaseController = require("./base/base.controller");
const CustomerService = require("../services/customer.service");
const ResponseHandler = require("../utils/responseHandler");

class CustomerController extends BaseController {
  constructor() {
    super(CustomerService);
  }

  /**
   * Get customer statistics
   */
  getStatistics = async (req, res) => {
    try {
      this.validateRequest(req);

      const stats = await this.service.getCustomerStatistics(req.params.id);

      const response = ResponseHandler.success(stats);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Get customer purchase history
   */
  getPurchaseHistory = async (req, res) => {
    try {
      this.validateRequest(req);

      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const customer = await this.service.findById(id, {
        populate: {
          path: "purchaseHistory",
          options: {
            sort: { createdAt: -1 },
            skip: (page - 1) * limit,
            limit: parseInt(limit),
            populate: [{ path: "items.product", select: "name price" }],
          },
        },
      });

      const response = ResponseHandler.success({
        history: customer.purchaseHistory,
        stats: {
          totalPurchases: customer.totalPurchases,
          totalSpent: customer.totalSpent,
          averageOrderValue: customer.averageOrderValue,
          lastPurchaseDate: customer.lastPurchaseDate,
        },
      });
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Update customer purchase stats manually
   */
  updateStats = async (req, res) => {
    try {
      this.validateRequest(req);

      const customer = await this.service.findById(req.params.id);
      await customer.updatePurchaseStats();

      const response = ResponseHandler.success(
        customer,
        "Customer stats updated successfully"
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };
}

module.exports = CustomerController;
