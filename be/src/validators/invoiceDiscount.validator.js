const { body } = require("express-validator");

exports.createInvoiceDiscountValidator = [
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

  body("minOrderValue")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum order value must be a positive number"),

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

  body("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)")
    .toInt(),
];

exports.updateInvoiceDiscountValidator = [
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

  ...exports.createInvoiceDiscountValidator.slice(2),
];

// Validate code for applying discount
exports.validateDiscountCodeValidator = [
  body("code").trim().notEmpty().withMessage("Discount code is required"),

  body("orderValue")
    .notEmpty()
    .withMessage("Order value is required")
    .isFloat({ min: 0 })
    .withMessage("Order value must be a positive number"),
];
