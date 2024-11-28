// src/validators/category.validator.js
const { body } = require("express-validator");
const { statusValidator } = require("./common.validator");

exports.createCategoryValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ max: 50 })
    .withMessage("Name cannot be more than 50 characters"),

  statusValidator,
];

exports.updateCategoryValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Name cannot be more than 50 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot be more than 500 characters"),

  statusValidator,
];
