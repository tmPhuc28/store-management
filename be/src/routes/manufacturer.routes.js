const BaseRouter = require("./base/base.router");
const ManufacturerController = require("../controllers/manufacturer.controller");
const {
  createManufacturerValidator,
  updateManufacturerValidator,
} = require("../validators/manufacturer.validator");

class ManufacturerRouter extends BaseRouter {
  constructor() {
    super(
      new ManufacturerController(),
      {
        create: createManufacturerValidator,
        update: updateManufacturerValidator,
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

module.exports = new ManufacturerRouter().getRouter();
