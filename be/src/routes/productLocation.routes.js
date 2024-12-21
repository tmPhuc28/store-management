const BaseRouter = require("./base/base.router");
const ProductLocationController = require("../controllers/productLocation.controller");
const {
  createProductLocationValidator,
  updateProductLocationValidator,
} = require("../validators/productLocation.validator");
const { objectIdValidator } = require("../validators/common.validator");

class ProductLocationRouter extends BaseRouter {
  constructor() {
    super(
      new ProductLocationController(),
      {
        create: createProductLocationValidator,
        update: updateProductLocationValidator,
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

    this.initializeCustomRoutes();
  }

  initializeCustomRoutes() {
    // Get warehouses
    this.router.get(
      "/warehouses",
      this.protected(),
      this.controller.getWarehouses
    );

    // Get areas by warehouse
    this.router.get(
      "/warehouses/:warehouse/areas",
      this.protected(),
      this.controller.getAreas
    );

    // Get product locations summary
    this.router.get(
      "/products/:productId/summary",
      [this.protected(), objectIdValidator("productId")],
      this.controller.getProductLocationsSummary
    );
  }
}

module.exports = new ProductLocationRouter().getRouter();
