// src/controllers/employee.controller.js
const BaseController = require("./base/base.controller");
const EmployeeService = require("../services/employee.service");

class EmployeeController extends BaseController {
  constructor() {
    super(EmployeeService);
  }
}

module.exports = EmployeeController;
