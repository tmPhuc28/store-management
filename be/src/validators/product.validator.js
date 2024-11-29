// src/validators/product.validator.js
const { body } = require("express-validator");

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
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage("SKU can only contain letters, numbers, and hyphens")
    .isLength({ min: 3, max: 50 })
    .withMessage("SKU must be between 3 and 50 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),

  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 0 })
    .withMessage("Quantity must be a non-negative integer"),

  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isMongoId()
    .withMessage("Invalid category ID"),

  body("manufacturer")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Manufacturer name cannot exceed 100 characters"),

  body("supplier")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Supplier name cannot exceed 100 characters"),

  body("variants")
    .optional()
    .isArray()
    .withMessage("Variants must be an array"),

  body("variants.*.name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Variant name is required")
    .isLength({ max: 50 })
    .withMessage("Variant name cannot exceed 50 characters"),

  body("variants.*.options")
    .optional()
    .isArray()
    .withMessage("Variant options must be an array"),

  body("variants.*.options.*")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Option value cannot be empty")
    .isLength({ max: 50 })
    .withMessage("Option value cannot exceed 50 characters"),

  body("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)"),
];

exports.updateProductValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty if provided")
    .isLength({ max: 100 })
    .withMessage("Name cannot be more than 100 characters"),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("quantity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Quantity must be a non-negative integer"),

  body("category").optional().isMongoId().withMessage("Invalid category ID"),

  body("manufacturer")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Manufacturer name cannot exceed 100 characters"),

  body("supplier")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Supplier name cannot exceed 100 characters"),

  body("variants")
    .optional()
    .isArray()
    .withMessage("Variants must be an array"),

  body("variants.*.name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Variant name is required")
    .isLength({ max: 50 })
    .withMessage("Variant name cannot exceed 50 characters"),

  body("variants.*.options")
    .optional()
    .isArray()
    .withMessage("Variant options must be an array"),

  body("variants.*.options.*")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Option value cannot be empty")
    .isLength({ max: 50 })
    .withMessage("Option value cannot exceed 50 characters"),

  body("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)"),
];
exports.discountValidator = [
  body("percentage")
    .notEmpty()
    .withMessage("Discount percentage is required")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount percentage must be between 0 and 100"),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid start date format"),

  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid end date format")
    .custom((endDate, { req }) => {
      if (req.body.startDate && endDate < req.body.startDate) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value"),
];

exports.bulkPriceUpdateValidator = [
  body("adjustment")
    .isNumeric()
    .withMessage("Adjustment must be a number")
    .custom((value, { req }) => {
      if (req.body.adjustmentType === "percentage") {
        if (value < -100) {
          throw new Error("Percentage adjustment cannot be less than -100%");
        }
      }
      return true;
    }),

  body("adjustmentType")
    .isIn(["fixed", "percentage"])
    .withMessage("Adjustment type must be either fixed or percentage"),
];
