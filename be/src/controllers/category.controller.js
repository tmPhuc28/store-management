const BaseController = require("./base/base.controller");
const CategoryService = require("../services/category.service");
const ResponseHandler = require("../utils/responseHandler");

class CategoryController extends BaseController {
  constructor() {
    super(CategoryService);
  }

  /**
   * Get root categories
   */
  getRootCategories = async (req, res) => {
    try {
      const onlyActive = req.query.onlyActive !== "false";
      const categories = await this.service.getRootCategories({ onlyActive });

      const response = ResponseHandler.success(categories);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Get leaf categories
   */
  getLeafCategories = async (req, res) => {
    try {
      const activeOnly = req.query.activeOnly !== "false";
      const categories = await this.service.getLeafCategories({ activeOnly });

      const response = ResponseHandler.success(categories);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Get category path
   */
  getCategoryPath = async (req, res) => {
    try {
      const path = await this.service.getCategoryPath(req.params.id);

      const response = ResponseHandler.success(path);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Get category children
   */
  getChildren = async (req, res) => {
    try {
      const onlyActive = req.query.onlyActive !== "false";
      const children = await this.service.getChildren(req.params.id, {
        onlyActive,
      });

      const response = ResponseHandler.success(children);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Get all descendants
   */
  getDescendants = async (req, res) => {
    try {
      const onlyActive = req.query.onlyActive !== "false";
      const descendants = await this.service.getDescendants(req.params.id, {
        onlyActive,
      });

      const response = ResponseHandler.success(descendants);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };
}

module.exports = CategoryController;
