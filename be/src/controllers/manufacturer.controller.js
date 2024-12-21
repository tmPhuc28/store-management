const BaseController = require("./base/base.controller");
const ManufacturerService = require("../services/manufacturer.service");

class ManufacturerController extends BaseController {
  constructor() {
    super(ManufacturerService);
  }
}

module.exports = ManufacturerController;
