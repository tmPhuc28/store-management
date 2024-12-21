// src/routes/customer.routes.js
const BaseRouter = require("./base/base.router");
const CustomerController = require("../controllers/customer.controller");
const {
  createCustomerValidator,
  updateCustomerValidator,
  customerHistoryValidator,
} = require("../validators/customer.validator");
const {
  paginationValidator,
  objectIdValidator,
} = require("../validators/common.validator");
const { authorize } = require("../middleware/auth");
class CustomerRouter extends BaseRouter {
  constructor() {
    super(
      new CustomerController(),
      {
        create: createCustomerValidator,
        update: updateCustomerValidator,
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
            adminOnly: false,
          },
          update: {
            protected: true,
            adminOnly: false,
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
    // Get customer statistics
    this.router.get(
      "/:id/statistics",
      [this.protected(), objectIdValidator("id")],
      this.controller.getStatistics
    );

    // Get customer purchase history
    this.router.get(
      "/:id/purchases",
      [
        this.protected(),
        objectIdValidator("id"),
        paginationValidator,
        customerHistoryValidator,
      ],
      this.controller.getPurchaseHistory
    );

    // Update customer stats manually
    this.router.post(
      "/:id/update-stats",
      [...this.protected(), authorize("admin"), objectIdValidator("id")],
      this.controller.updateStats
    );
  }
}

module.exports = new CustomerRouter().getRouter();
