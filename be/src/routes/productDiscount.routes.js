const BaseRouter = require("./base/base.router");
const ProductDiscountController = require("../controllers/productDiscount.controller");
const {
  createProductDiscountValidator,
  updateProductDiscountValidator,
} = require("../validators/productDiscount.validator");
const { objectIdValidator } = require("../validators/common.validator");

class ProductDiscountRouter extends BaseRouter {
  constructor() {
    super(
      new ProductDiscountController(),
      {
        create: createProductDiscountValidator,
        update: updateProductDiscountValidator,
      },
      {
        protected: true,
        routes: {
          getAll: {
            protected: true,
            adminOnly: false,
          },
          getOne: {
            protected: true,
            adminOnly: false,
          },
          create: {
            protected: true,
            adminOnly: true,
          },
          update: {
            protected: true,
            adminOnly: true,
          },
          updateStatus: {
            protected: true,
            adminOnly: true,
          },
          delete: {
            protected: true,
            adminOnly: true,
          },
          getHistory: {
            protected: true,
            adminOnly: true,
          },
          deleteHistoryEntry: {
            protected: true,
            adminOnly: true,
          },
          clearHistory: {
            protected: true,
            adminOnly: true,
          },
        },
      }
    );
  }

  initializeCustomRoutes() {
    // Get applicable discounts for a product
    this.router.get(
      "/products/:productId/applicable",
      [this.protected(), objectIdValidator("productId")],
      this.controller.getApplicableDiscounts
    );
  }
}

module.exports = new ProductDiscountRouter().getRouter();
