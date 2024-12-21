const BaseController = require("./base/base.controller");
const ProductDiscountService = require("../services/productDiscount.service");
const ResponseHandler = require("../utils/responseHandler");

class ProductDiscountController extends BaseController {
  constructor() {
    super(ProductDiscountService);
  }

  /**
   * Get applicable discounts for a product
   */
  getApplicableDiscounts = async (req, res) => {
    try {
      const { autoApplyOnly } = req.query;
      const discounts = await this.service.getApplicableDiscounts(
        req.params.productId,
        { autoApplyOnly: autoApplyOnly === "true" }
      );

      const response = ResponseHandler.success(discounts);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };
}

module.exports = ProductDiscountController;
