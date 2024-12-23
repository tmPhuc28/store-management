// src/controllers/user.controller.js
const BaseController = require("./base/base.controller");
const UserService = require("../services/user.service");
const ResponseHandler = require("../utils/responseHandler");

class UserController extends BaseController {
  constructor() {
    super(UserService);
  }

  /**
   * Force logout user from all devices
   */
  forceLogout = async (req, res) => {
    try {
      this.validateRequest(req);

      const user = await this.service.getFullDocument(req.params.id);
      await user.removeAllRefreshTokens();

      const response = ResponseHandler.success(
        null,
        "User logged out from all devices"
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  create = async (req, res) => {
    try {
      this.validateRequest(req);

      const userData = {
        ...req.body,
        createdBy: req.user?._id,
      };

      const user = await this.service.create(userData, req.user);

      const response = ResponseHandler.success(
        user,
        "User created successfully"
      );
      res.status(201).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };
}

module.exports = UserController;
