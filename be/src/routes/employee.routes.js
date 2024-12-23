// src/routes/employee.routes.js
const BaseRouter = require("./base/base.router");
const EmployeeController = require("../controllers/employee.controller");
const {
  createEmployeeValidator,
  updateEmployeeValidator,
} = require("../validators/employee.validator");

class EmployeeRouter extends BaseRouter {
  constructor() {
    super(
      new EmployeeController(),
      {
        create: createEmployeeValidator,
        update: updateEmployeeValidator,
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

module.exports = new EmployeeRouter().getRouter();
