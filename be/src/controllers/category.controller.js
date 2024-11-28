// src/controllers/category.controller.js
const { validationResult } = require("express-validator");
const categoryService = require("../services/category.service");

exports.getCategories = async (req, res, next) => {
  try {
    const result = await categoryService.getCategories(req.query, req.user);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.getCategory = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryById(
      req.params.id,
      req.user
    );
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    if (error.message === "Category not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const category = await categoryService.create(req.body, req.user);

    // Populate references for response
    await category.populate([
      { path: "parentCategory", select: "name" },
      { path: "createdBy", select: "username email" },
      { path: "updateHistory.updatedBy", select: "username email" },
    ]);

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    if (
      [
        "Active category with this name already exists",
        "Parent category not found",
        "Parent category is inactive",
        "Category cannot be its own parent",
        "Circular reference detected in category hierarchy",
      ].includes(error.message)
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const category = await categoryService.update(
      req.params.id,
      req.body,
      req.user
    );

    // Populate references for response
    await category.populate([
      { path: "parentCategory", select: "name" },
      { path: "createdBy", select: "username email" },
      { path: "updateHistory.updatedBy", select: "username email" },
    ]);

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    if (
      [
        "Category not found",
        "Active category with this name already exists",
        "Parent category not found",
        "Parent category is inactive",
        "Category cannot be its own parent",
        "Circular reference detected in category hierarchy",
      ].includes(error.message)
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const result = await categoryService.deleteCategory(
      req.params.id,
      req.user
    );
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error.message === "Category not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message.includes("Cannot delete category with subcategories")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

exports.updateCategoryStatus = async (req, res, next) => {
  try {
    const updatedCategory = await categoryService.updateStatus(
      req.params.id,
      parseInt(req.body.status),
      req.user
    );

    // Populate references for response
    await updatedCategory.populate([
      { path: "parentCategory", select: "name" },
      { path: "createdBy", select: "username email" },
      { path: "updateHistory.updatedBy", select: "username email" },
    ]);

    res.status(200).json({ success: true, data: updatedCategory });
  } catch (error) {
    if (error.message === "Category not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message.includes("Status must be")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

exports.getLeafCategories = async (req, res, next) => {
  try {
    const activeOnly = req.query.activeOnly !== "false";
    const categories = await categoryService.getLeafCategories({ activeOnly });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTopCategories = async (req, res, next) => {
  try {
    const onlyActive = req.query.onlyActive !== "false";
    const categories = await categoryService.getTopCategories({ onlyActive });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCategoryPath = async (req, res, next) => {
  try {
    const path = await categoryService.getCategoryPath(req.params.id, req.user);

    res.status(200).json({
      success: true,
      pathLength: path.length,
      data: path,
    });
  } catch (error) {
    if (error.message === "Category not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

module.exports = exports;
