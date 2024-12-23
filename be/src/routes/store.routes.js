// src/routes/store.routes.js
const BaseRouter = require("./base/base.router");
const StoreController = require("../controllers/store.controller");
const {
  updateStoreValidator,
  validateBankInfo,
} = require("../validators/store.validator");
const { authorize } = require("../middleware/auth");

class StoreRouter extends BaseRouter {
  constructor() {
    // Tạo instance mới của StoreController
    super(
      new StoreController(),
      {},
      {
        protected: true,
        // Override default routes since store is singleton
        routes: {
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
    // Get store info
    this.router.get("/", this.protected(), this.controller.getStore);

    // Update store info
    this.router.put(
      "/",
      [...this.protected(), authorize("admin")],
      updateStoreValidator,
      this.controller.updateStore
    );

    // Get bank info
    this.router.get(
      "/bank-info",
      this.protected(),
      this.controller.getStoreBankInfo
    );

    // Update bank info
    this.router.put(
      "/bank-info",
      [...this.protected(), authorize("admin")],
      validateBankInfo,
      this.controller.updateBankInfo
    );

    // Get history
    this.router.get(
      "/history",
      [...this.protected(), authorize("admin")],
      this.controller.getHistory
    );

    // Delete history entry
    this.router.delete(
      "/history/:historyId",
      [...this.protected(), authorize("admin")],
      this.controller.deleteHistoryEntry
    );

    // Clear all history
    this.router.delete(
      "/history",
      [...this.protected(), authorize("admin")],
      this.controller.clearHistory
    );
  }
}

module.exports = new StoreRouter().getRouter();
