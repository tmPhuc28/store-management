// src/routes/product.routes.js
const BaseRouter = require("./base/base.router");
const ProductController = require("../controllers/product.controller");
const {
  createProductValidator,
  updateProductValidator,
  discountValidator,
  pricesValidator,
  quantityValidator,
  discontinueValidator,
  adjustQuantityValidator,
} = require("../validators/product.validator");
const { objectIdValidator } = require("../validators/common.validator");
const { authorize } = require("../middleware/auth");

class ProductRouter extends BaseRouter {
  constructor() {
    super(
      new ProductController(),
      {
        create: createProductValidator,
        update: updateProductValidator,
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
    // Apply discount to product
    this.router.post(
      "/:id/discounts",
      [
        this.protected(),
        authorize("admin"),
        objectIdValidator("id"),
        discountValidator,
      ],
      this.controller.applyDiscountCode
    );

    // Remove discount from product
    this.router.delete(
      "/:id/discounts",
      [this.protected(), authorize("admin"), objectIdValidator("id")],
      this.controller.removeDiscount
    );

    // Discontinue product
    this.router.post(
      "/:id/discontinue",
      [
        this.protected(),
        authorize("admin"),
        objectIdValidator("id"),
        discontinueValidator,
      ],
      this.controller.discontinue
    );

    // Update prices
    this.router.patch(
      "/:id/prices",
      [
        this.protected(),
        authorize("admin"),
        objectIdValidator("id"),
        pricesValidator,
      ],
      this.controller.updatePrices
    );

    // Update quantity
    this.router.patch(
      "/:id/quantity",
      [
        this.protected(),
        authorize("admin"),
        objectIdValidator("id"),
        quantityValidator,
      ],
      this.controller.updateQuantity
    );

    // Adjust quantity
    this.router.post(
      "/:id/quantity/adjust",
      [
        this.protected(),
        authorize("admin"),
        objectIdValidator("id"),
        adjustQuantityValidator,
      ],
      this.controller.adjustQuantity
    );
  }
}

module.exports = new ProductRouter().getRouter();
