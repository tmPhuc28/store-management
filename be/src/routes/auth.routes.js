// src/routes/auth.routes.js
const BaseRouter = require("./base/base.router");
const AuthController = require("../controllers/auth.controller");
const { preventLoggedInAccess } = require("../middleware/auth");
const {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
  changePasswordValidator,
} = require("../validators/auth.validator");

class AuthRouter extends BaseRouter {
  constructor() {
    super(
      new AuthController(),
      {},
      {
        protected: false,
        routes: {
          getAll: false,
          getOne: false,
          create: false,
          update: false,
          delete: false,
        },
      }
    );
  }

  initializeCustomRoutes() {
    // Các route công khai
    this.customRouter(
      "post",
      "/register",
      this.controller.register,
      [preventLoggedInAccess, registerValidator],
      false
    );
    this.customRouter(
      "post",
      "/login",
      this.controller.login,
      [preventLoggedInAccess, loginValidator],
      false
    );
    this.customRouter(
      "post",
      "/refresh-token",
      this.controller.refreshToken,
      [refreshTokenValidator],
      false
    );

    // Các route được bảo vệ
    this.customRouter("get", "/me", this.controller.getMe);
    this.customRouter("post", "/logout", this.controller.logout);
    this.customRouter("post", "/logout-all", this.controller.logoutAll);
    this.customRouter(
      "post",
      "/change-password",
      this.controller.changePassword,
      [changePasswordValidator]
    );
  }
}

module.exports = new AuthRouter().getRouter();
