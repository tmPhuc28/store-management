// src/routes/payment.routes.js
const BaseRouter = require("./base/base.router");
const PaymentController = require("../controllers/payment.controller");
const {
  validateBankInfo,
  validateQRGeneration,
} = require("../validators/payment.validator");
const { authorize } = require("../middleware/auth");

class PaymentRouter extends BaseRouter {
  constructor() {
    // Tạo instance mới của PaymentController
    super(
      new PaymentController(),
      {},
      {
        protected: true,
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
    // Get banks list
    this.router.get("/banks", this.protected(), this.controller.getBanks);

    // Find bank
    this.router.get("/banks/find", this.protected(), this.controller.findBank);

    // Generate QR code
    this.router.post(
      "/qr",
      this.protected(),
      validateQRGeneration,
      this.controller.generateQR
    );

    // Validate QR URL
    this.router.post(
      "/qr/validate",
      this.protected(),
      this.controller.validateQR
    );
  }
}

module.exports = new PaymentRouter().getRouter();
