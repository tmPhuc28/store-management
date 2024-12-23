// src/routes/base/base.router.js
const express = require("express");
const { protect, authorize } = require("../../middleware/auth");
const {
  paginationValidator,
  sortValidator,
  searchValidator,
  objectIdValidator,
  statusValidator,
} = require("../../validators/common.validator");

class BaseRouter {
  constructor(controller, validators = {}, options = {}) {
    this.router = express.Router();
    this.controller = controller;
    this.validators = validators;
    this.options = {
      protected: true,
      adminOnly: false,
      allowedRoles: [], // Additional roles besides admin
      routes: {
        getAll: true,
        getOne: true,
        create: true,
        update: true,
        updateStatus: true,
        delete: true,
        getHistory: true,
        deleteHistoryEntry: true,
        clearHistory: true,
      },
      ...options,
    };

    this.initializeRoutes();
    this.initializeCustomRoutes();
  }

  /**
   * Apply route protection middleware
   */
  protected() {
    const middleware = [protect];

    if (this.options.adminOnly) {
      middleware.push(authorize("admin"));
    } else if (this.options.allowedRoles.length > 0) {
      middleware.push(authorize("admin", ...this.options.allowedRoles));
    }

    return middleware;
  }

  /**
   * Initialize all routes
   */
  initializeRoutes() {
    const { routes } = this.options;

    // GET all
    if (routes.getAll) {
      this.router.get(
        "/",
        routes.getAll.protected ? this.protected() : [],
        [
          paginationValidator,
          sortValidator,
          searchValidator,
          ...(this.validators.getAll || []),
        ],
        this.controller.getAll
      );
    }

    // GET one
    if (routes.getOne) {
      this.router.get(
        "/:id",
        routes.getOne.protected ? this.protected() : [],
        [objectIdValidator("id"), ...(this.validators.getOne || [])],
        this.controller.getOne
      );
    }

    // GET history
    if (routes.getHistory) {
      this.router.get(
        "/:id/history",
        routes.getHistory.protected ? this.protected() : [],
        [
          objectIdValidator("id"),
          paginationValidator,
          sortValidator,
          ...(this.validators.getHistory || []),
        ],
        this.controller.getHistory
      );
    }

    // Delete history entry
    if (this.options.routes.deleteHistoryEntry) {
      this.router.delete(
        "/:id/history/:historyId",
        this.protected(),
        [
          objectIdValidator("id"),
          objectIdValidator("historyId"),
          ...(this.validators.deleteHistoryEntry || []),
        ],
        this.controller.deleteHistoryEntry
      );
    }

    // Clear all history
    if (this.options.routes.clearHistory) {
      this.router.delete(
        "/:id/history",
        this.protected(),
        [objectIdValidator("id"), ...(this.validators.clearHistory || [])],
        this.controller.clearHistory
      );
    }

    // POST create
    if (routes.create) {
      this.router.post(
        "/",
        routes.create.protected ? this.protected() : [],
        this.validators.create || [],
        this.controller.create
      );
    }

    // PUT update
    if (routes.update) {
      this.router.put(
        "/:id",
        routes.update.protected ? this.protected() : [],
        [objectIdValidator("id"), ...(this.validators.update || [])],
        this.controller.update
      );
    }

    // PATCH update status
    if (routes.updateStatus) {
      this.router.patch(
        "/:id/status",
        routes.updateStatus.protected ? this.protected() : [],
        [
          objectIdValidator("id"),
          statusValidator,
          ...(this.validators.updateStatus || []),
        ],
        this.controller.updateStatus
      );
    }

    // DELETE
    if (routes.delete) {
      this.router.delete(
        "/:id",
        routes.delete.protected ? this.protected() : [],
        [objectIdValidator("id"), ...(this.validators.delete || [])],
        this.controller.delete
      );
    }
  }

  /**
   * Initialize custom routes
   */
  initializeCustomRoutes() {
    //custom routes
  }

  /**
   * Add custom route
   */
  customRouter(method, path, handler, validators = [], isProtected = true) {
    const middleware = isProtected
      ? [...this.protected(), ...validators]
      : [...validators];
    this.router[method](path, middleware, handler);
    return this;
  }

  /**
   * Get the configured router
   */
  getRouter() {
    return this.router;
  }
}

module.exports = BaseRouter;
