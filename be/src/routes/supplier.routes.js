const BaseRouter = require("./base/base.router");
const SupplierController = require("../controllers/supplier.controller");
const {
  createSupplierValidator,
  updateSupplierValidator,
} = require("../validators/supplier.validator");

class SupplierRouter extends BaseRouter {
  constructor() {
    super(
      new SupplierController(),
      {
        create: createSupplierValidator,
        update: updateSupplierValidator,
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
}

module.exports = new SupplierRouter().getRouter();
