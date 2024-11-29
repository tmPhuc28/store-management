// src/validators/invoice.validator.js
const { body, query } = require("express-validator");

exports.createInvoiceValidator = [
  // Customer validation
  body("customer")
    .notEmpty()
    .withMessage("Customer is required")
    .isMongoId()
    .withMessage("Invalid customer ID"),

  // Items validation
  body("items")
    .isArray({ min: 1 })
    .withMessage("Invoice must have at least one item"),

  body("items.*.product")
    .notEmpty()
    .withMessage("Product is required for each item")
    .isMongoId()
    .withMessage("Invalid product ID"),

  body("items.*.quantity")
    .notEmpty()
    .withMessage("Quantity is required for each item")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),

  // Payment method validation
  body("paymentMethod")
    .notEmpty()
    .withMessage("Payment method is required")
    .isIn(["cash", "card", "bank_transfer", "qr_code"])
    .withMessage("Invalid payment method"),

  // Optional fields validation
  body("discount")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount must be between 0 and 100 percent"),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),
];

exports.updatePaymentStatusValidator = [
  body("paymentStatus")
    .notEmpty()
    .withMessage("Payment status is required")
    .isIn(["pending", "paid", "cancelled"])
    .withMessage("Invalid payment status"),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),
];

exports.getInvoicesValidator = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid start date format"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid end date format")
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate < req.query.startDate) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),

  query("paymentStatus")
    .optional()
    .isIn(["pending", "paid", "cancelled"])
    .withMessage("Invalid payment status"),

  query("customer").optional().isMongoId().withMessage("Invalid customer ID"),
];

exports.getStatisticsValidator = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid start date format"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid end date format")
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate < req.query.startDate) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),

  query("groupBy")
    .optional()
    .isIn(["day", "week", "month", "year"])
    .withMessage("Invalid grouping option"),
];

exports.exportInvoicesValidator = [
  query("format")
    .optional()
    .isIn(["csv", "xlsx"])
    .withMessage("Invalid export format"),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid start date format"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid end date format"),

  query("status").optional().isIn([0, 1]).withMessage("Invalid status"),

  query("paymentStatus")
    .optional()
    .isIn(["pending", "paid", "cancelled"])
    .withMessage("Invalid payment status"),
];

exports.validateInvoiceItems = (items) => {
  const errors = [];

  if (!Array.isArray(items) || items.length === 0) {
    errors.push("At least one item is required");
    return errors;
  }

  items.forEach((item, index) => {
    if (!item.product) {
      errors.push(`Item ${index + 1}: Product is required`);
    }
    if (!item.quantity || item.quantity < 1) {
      errors.push(`Item ${index + 1}: Valid quantity is required`);
    }
    if (item.discount && (item.discount < 0 || item.discount > 100)) {
      errors.push(`Item ${index + 1}: Discount must be between 0 and 100`);
    }
  });

  return errors;
};

exports.validatePaymentData = async (paymentMethod, amount) => {
  const errors = [];

  switch (paymentMethod) {
    case "card":
      // Add specific card payment validations
      break;
    case "bank_transfer":
      // Add specific bank transfer validations
      break;
    case "qr_code":
      // Add specific QR code validations
      break;
    case "cash":
      // Add specific cash validations
      break;
    default:
      errors.push("Invalid payment method");
  }

  if (amount <= 0) {
    errors.push("Invalid payment amount");
  }

  return errors;
};
