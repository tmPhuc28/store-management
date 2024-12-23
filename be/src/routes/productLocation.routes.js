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
  }

  initializeCustomRoutes() {
    this.customRouter("get", "/warehouses", this.controller.getWarehouses);
    this.customRouter(
      "get",
      "/warehouses/:warehouse/areas",
      this.controller.getAreas
    );
    this.customRouter(
      "get",
      "/products/:productId/summary",
      this.controller.getProductLocationsSummary,
      [objectIdValidator("productId")]
    );
  }
}

module.exports = new ProductLocationRouter().getRouter();
