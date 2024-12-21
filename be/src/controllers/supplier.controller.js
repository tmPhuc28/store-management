const BaseController = require("./base/base.controller");
const SupplierService = require("../services/supplier.service");

class SupplierController extends BaseController {
  constructor() {
    super(SupplierService);
  }
}

module.exports = SupplierController;
