// src/routes/user.routes.js
const BaseRouter = require("./base/base.router");
const UserController = require("../controllers/user.controller");
const {
  updateUserValidator,
  validateUserUpdate,
} = require("../validators/user.validator");

const { objectIdValidator } = require("../validators/common.validator");
class UserRouter extends BaseRouter {
  constructor() {
    super(
      new UserController(),
      {
        update: [updateUserValidator, validateUserUpdate],
      },
      {
        protected: true,
        adminOnly: true,
        routes: {
          getAll: {
            protected: true,
            adminOnly: true,
          },
          getOne: {
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
    // Force logout user
    this.router.post(
      "/:id/logout",
      [this.protected(), objectIdValidator("id")],
      this.controller.forceLogout
    );
  }
}

module.exports = new UserRouter().getRouter();
