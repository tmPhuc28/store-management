// src/validators/product.validator.js
const { body } = require("express-validator");
const { statusValidator } = require("./common.validator");

exports.createProductValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot be more than 100 characters"),

  body("sku")
    .trim()
    .notEmpty()
    .withMessage("SKU is required")
    .isAlphanumeric()
    .withMessage("SKU must be alphanumeric"),

  body("description").trim().notEmpty().withMessage("Description is required"),

  body("price")
    .isNumeric()
    .withMessage("Price must be a number")
    .isFloat({ min: 0 })
    .withMessage("Price must be greater than or equal to 0"),

  body("quantity")
    .isInt({ min: 0 })
    .withMessage("Quantity must be a non-negative integer"),

  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isMongoId()
    .withMessage("Invalid category ID"),

  body("manufacturer").optional().trim(),

  body("supplier").optional().trim(),

  statusValidator,

  body("variants")
    .optional()
    .isArray()
    .withMessage("Variants must be an array"),

  body("variants.*.name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Variant name is required"),

  body("variants.*.options")
    .optional()
    .isArray()
    .withMessage("Variant options must be an array"),
];

exports.updateProductValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Name cannot be more than 100 characters"),

  body("price")
    .optional()
    .isNumeric()
    .withMessage("Price must be a number")
    .isFloat({ min: 0 })
    .withMessage("Price must be greater than or equal to 0"),

  body("quantity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Quantity must be a non-negative integer"),

  statusValidator,
];
