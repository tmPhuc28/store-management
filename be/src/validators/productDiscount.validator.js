const { body } = require("express-validator");

exports.createProductDiscountValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Discount name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot be more than 100 characters"),

  body("code")
    .trim()
    .notEmpty()
    .withMessage("Discount code is required")
    .matches(/^[A-Za-z0-9-]+$/)
    .withMessage("Code can only contain letters, numbers, and hyphens")
    .isLength({ max: 20 })
    .withMessage("Code cannot be more than 20 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot be more than 500 characters"),

  body("type")
    .notEmpty()
    .withMessage("Discount type is required")
    .isIn(["percentage", "fixed"])
    .withMessage("Type must be either percentage or fixed"),

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

  body("applicableProducts")
    .optional()
    .isArray()
    .withMessage("Applicable products must be an array"),

  body("applicableProducts.*")
    .optional()
    .isMongoId()
    .withMessage("Invalid product ID"),

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

  body("usageLimit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Usage limit must be at least 1"),

  body("autoApply")
    .optional()
    .isBoolean()
    .withMessage("Auto apply must be a boolean value"),

  body("priority")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Priority must be a non-negative integer"),

  body("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)")
    .toInt(),
];

exports.updateProductDiscountValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Name cannot be more than 100 characters"),

  body("code")
    .optional()
    .trim()
    .matches(/^[A-Za-z0-9-]+$/)
    .withMessage("Code can only contain letters, numbers, and hyphens")
    .isLength({ max: 20 })
    .withMessage("Code cannot be more than 20 characters"),

  ...exports.createProductDiscountValidator.slice(2),
];
