// src/validators/discount.validator.js
const { body, query } = require("express-validator");

exports.createDiscountValidator = [
  // Code validation
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Discount code is required")
    .isLength({ min: 3, max: 20 })
    .withMessage("Code must be between 3 and 20 characters")
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage(
      "Code can only contain letters, numbers, hyphens and underscores"
    )
    .toUpperCase(),

  // Description validation
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 200 })
    .withMessage("Description cannot exceed 200 characters"),

  // Type validation
  body("type")
    .notEmpty()
    .withMessage("Discount type is required")
    .isIn(["percentage", "fixed"])
    .withMessage("Type must be either percentage or fixed"),

  // Value validation
  body("value")
    .notEmpty()
    .withMessage("Discount value is required")
    .isFloat({ min: 0 })
    .withMessage("Value must be a positive number")
    .custom((value, { req }) => {
      if (req.body.type === "percentage" && value > 100) {
        throw new Error("Percentage discount cannot exceed 100%");
      }
      return true;
    }),

  // Minimum order value validation
  body("minOrderValue")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum order value must be a positive number"),

  // Maximum discount amount validation
  body("maxDiscount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum discount must be a positive number")
    .custom((value, { req }) => {
      if (req.body.type === "fixed" && value) {
        throw new Error(
          "Maximum discount only applies to percentage discounts"
        );
      }
      return true;
    }),

  // Date validations
  body("startDate")
    .notEmpty()
    .withMessage("Start date is required")
    .isISO8601()
    .withMessage("Invalid start date format")
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error("Start date cannot be in the past");
      }
      return true;
    }),

  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid end date format")
    .custom((value, { req }) => {
      if (!value) return true;
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),

  // Usage limit validation
  body("usageLimit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Usage limit must be a positive integer"),

  // Status validation
  body("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)")
    .toInt(),
];

exports.updateDiscountValidator = [
  // Make all fields optional for update
  body("code")
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Code must be between 3 and 20 characters")
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage(
      "Code can only contain letters, numbers, hyphens and underscores"
    )
    .toUpperCase(),

  // ... other fields similar to create but optional
  body("description")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Description cannot exceed 200 characters"),

  body("type")
    .optional()
    .isIn(["percentage", "fixed"])
    .withMessage("Type must be either percentage or fixed"),

  // ... continue with other fields
];

exports.validateDiscountValidator = [
  body("code").trim().notEmpty().withMessage("Discount code is required"),

  body("orderValue")
    .notEmpty()
    .withMessage("Order value is required")
    .isFloat({ min: 0 })
    .withMessage("Order value must be a positive number"),
];

exports.updateDiscountStatusValidator = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)")
    .toInt(),
];

exports.getDiscountsValidator = [
  query("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Invalid status value")
    .toInt(),

  query("type")
    .optional()
    .isIn(["percentage", "fixed"])
    .withMessage("Invalid discount type"),

  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean")
    .toBoolean(),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),

  query("sortBy")
    .optional()
    .matches(/^[-]?(createdAt|code|value|startDate|endDate|usedCount)$/)
    .withMessage("Invalid sort field"),
];

exports.validateDiscountDates = (startDate, endDate) => {
  const errors = [];
  const now = new Date();
  const start = new Date(startDate);

  if (start < now) {
    errors.push("Start date cannot be in the past");
  }

  if (endDate) {
    const end = new Date(endDate);
    if (end <= start) {
      errors.push("End date must be after start date");
    }
  }

  return errors;
};

exports.validateDiscountValue = (type, value, maxDiscount) => {
  const errors = [];

  if (type === "percentage") {
    if (value < 0 || value > 100) {
      errors.push("Percentage discount must be between 0 and 100");
    }
    if (maxDiscount && maxDiscount <= 0) {
      errors.push("Maximum discount amount must be positive");
    }
  } else if (type === "fixed") {
    if (value <= 0) {
      errors.push("Fixed discount must be greater than 0");
    }
    if (maxDiscount) {
      errors.push("Maximum discount only applies to percentage discounts");
    }
  }

  return errors;
};
