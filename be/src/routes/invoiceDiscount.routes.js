const BaseRouter = require("./base/base.router");
const InvoiceDiscountController = require("../controllers/invoiceDiscount.controller");
const {
  createInvoiceDiscountValidator,
  updateInvoiceDiscountValidator,
  validateDiscountCodeValidator,
} = require("../validators/invoiceDiscount.validator");
const { objectIdValidator } = require("../validators/common.validator");

class InvoiceDiscountRouter extends BaseRouter {
  constructor() {
    super(
      new InvoiceDiscountController(),
      {
        create: createInvoiceDiscountValidator,
        update: updateInvoiceDiscountValidator,
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
    // Validate discount code
    this.router.post(
      "/validate",
      [this.protected(), validateDiscountCodeValidator],
      this.controller.validateCode
    );

    // Calculate discount amount
    this.router.get(
      "/:id/calculate",
      [this.protected(), objectIdValidator("id")],
      this.controller.calculateDiscount
    );
  }
}

module.exports = new InvoiceDiscountRouter().getRouter();
