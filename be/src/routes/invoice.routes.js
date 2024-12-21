// src/routes/invoice.routes.js
const BaseRouter = require("./base/base.router");
const InvoiceController = require("../controllers/invoice.controller");
const {
  createInvoiceValidator,
  updateStatusValidator,
  paymentValidator,
  refundValidator,
  statisticsValidator,
} = require("../validators/invoice.validator");
const { objectIdValidator } = require("../validators/common.validator");

class InvoiceRouter extends BaseRouter {
  constructor() {
    super(
      new InvoiceController(),
      {
        create: createInvoiceValidator,
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
        },
      }
    );

    this.initializeCustomRoutes();
  }

  initializeCustomRoutes() {
    // Cập nhật trạng thái
    this.router.patch(
      "/:id/status",
      [this.protected(), objectIdValidator("id"), updateStatusValidator],
      this.controller.updateStatus
    );

    // Xác nhận thanh toán
    this.router.post(
      "/:id/payment",
      [this.protected(), objectIdValidator("id"), paymentValidator],
      this.controller.confirmPayment
    );

    // Hủy hóa đơn
    this.router.post(
      "/:id/cancel",
      [this.protected(), objectIdValidator("id"), updateStatusValidator],
      this.controller.cancelInvoice
    );

    // Hoàn tiền
    this.router.post(
      "/:id/refund",
      [this.protected(), objectIdValidator("id"), refundValidator],
      this.controller.processRefund
    );

    // Thống kê
    this.router.get(
      "/statistics",
      [this.protected(), statisticsValidator],
      this.controller.getStatistics
    );

    // Lấy hóa đơn của khách hàng
    this.router.get(
      "/customer/:customerId",
      [this.protected(), objectIdValidator("customerId")],
      this.controller.getCustomerInvoices
    );
  }
}

module.exports = new InvoiceRouter().getRouter();
