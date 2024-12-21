// src/routes/auth.routes.js
const BaseRouter = require("./base/base.router");
const AuthController = require("../controllers/auth.controller");
const { protect, preventLoggedInAccess } = require("../middleware/auth");
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

    this.initializeCustomRoutes();
  }

  initializeCustomRoutes() {
    // Public routes
    this.router.post(
      "/register",
      //preventLoggedInAccess,
      registerValidator,
      this.controller.register
    );

    this.router.post(
      "/login",
      //preventLoggedInAccess,
      loginValidator,
      this.controller.login
    );

    this.router.post(
      "/refresh-token",
      refreshTokenValidator,
      this.controller.refreshToken
    );

    // Protected routes
    this.router.use(protect);

    this.router.get("/me", this.controller.getMe);

    this.router.post("/logout", this.controller.logout);

    this.router.post("/logout-all", this.controller.logoutAll);

    this.router.post(
      "/change-password",
      changePasswordValidator,
      this.controller.changePassword
    );
  }
}

module.exports = new AuthRouter().getRouter();
