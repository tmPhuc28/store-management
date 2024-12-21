const BaseController = require("./base/base.controller");
const InvoiceDiscountService = require("../services/invoiceDiscount.service");
const ResponseHandler = require("../utils/responseHandler");

class InvoiceDiscountController extends BaseController {
  constructor() {
    super(InvoiceDiscountService);
  }

  /**
   * Validate discount code
   */
  validateCode = async (req, res) => {
    try {
      this.validateRequest(req);

      const { code, orderValue } = req.body;
      const discount = await this.service.validateCode(code, orderValue);

      const discountAmount = await this.service.calculateDiscount(
        discount._id,
        orderValue
      );

      const response = ResponseHandler.success({
        discount,
        discountAmount,
      });
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Calculate discount amount
   */
  calculateDiscount = async (req, res) => {
    try {
      const amount = await this.service.calculateDiscount(
        req.params.id,
        req.query.orderValue
      );

      const response = ResponseHandler.success({ amount });
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };
}

module.exports = InvoiceDiscountController;
