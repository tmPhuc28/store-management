// src/controllers/base/base.controller.js
const { validationResult } = require("express-validator");
const ResponseHandler = require("../../utils/responseHandler");

class BaseController {
  constructor(service) {
    this.service = service;
  }

  /**
   * Validate request data
   */
  validateRequest(req) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 400;
      error.errors = errors.array();
      throw error;
    }
  }

  /**
   * Generic CRUD handlers
   */
  getAll = async (req, res) => {
    try {
      this.validateRequest(req);

      const { page, limit, sort, search, populate, select, ...params } =
        req.query;

      const options = {
        page,
        limit,
        sort,
        search,
        populate,
        select,
      };

      const result = await this.service.find(params, options);

      const response = ResponseHandler.success(result);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  getOne = async (req, res) => {
    try {
      this.validateRequest(req);

      const document = await this.service.findById(req.params.id, {
        populate: req.query.populate,
        select: req.query.select,
      });

      const response = ResponseHandler.success(document);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Get entity history
   */
  getHistory = async (req, res) => {
    try {
      this.validateRequest(req);

      const { page, limit, sort } = req.query;
      const options = {
        page,
        limit,
        sort,
      };

      const result = await this.service.getHistory(req.params.id, options);

      const response = ResponseHandler.success(result);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Delete history entry
   */
  deleteHistoryEntry = async (req, res) => {
    try {
      this.validateRequest(req);

      const history = await this.service.deleteHistoryEntry(
        req.params.id,
        req.params.historyId,
        req.user
      );

      const response = ResponseHandler.success(history);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Clear all history
   */
  clearHistory = async (req, res) => {
    try {
      this.validateRequest(req);

      const history = await this.service.clearHistory(req.params.id, req.user);

      const response = ResponseHandler.success(history);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  create = async (req, res) => {
    try {
      this.validateRequest(req);

      const document = await this.service.create(req.body, req.user);

      const response = ResponseHandler.success(
        document,
        `${this.service.serviceName} created successfully`,
        201
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  update = async (req, res) => {
    try {
      this.validateRequest(req);

      const document = await this.service.update(
        req.params.id,
        req.body,
        req.user
      );

      const response = ResponseHandler.success(
        document,
        `${this.service.serviceName} updated successfully`
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  updateStatus = async (req, res) => {
    try {
      this.validateRequest(req);

      const document = await this.service.updateStatus(
        req.params.id,
        parseInt(req.body.status),
        req.user
      );

      const response = ResponseHandler.success(
        document,
        `${this.service.serviceName} status updated successfully`
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  delete = async (req, res) => {
    try {
      this.validateRequest(req);

      const result = await this.service.delete(req.params.id, req.user);

      const response = ResponseHandler.success(
        result,
        `${this.service.serviceName} deleted successfully`
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * Helper method to handle file responses
   */
  sendFile(res, fileBuffer, fileName, mimeType) {
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(fileBuffer);
  }
}

module.exports = BaseController;
