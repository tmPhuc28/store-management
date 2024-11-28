// src/validators/invoice.validator.js
const { body } = require("express-validator");

exports.createInvoiceValidator = [
  body("customer")
    .notEmpty()
    .withMessage("Customer is required")
    .isMongoId()
    .withMessage("Invalid customer ID"),

  body("items")
    .isArray({ min: 1 })
    .withMessage("Invoice must have at least one item"),

  body("items.*.product")
    .notEmpty()
    .withMessage("Product is required for each item")
    .isMongoId()
    .withMessage("Invalid product ID"),

  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),

  body("items.*.price")
    .isFloat({ min: 0 })
    .withMessage("Price cannot be negative"),

  body("items.*.discount")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount must be between 0 and 100"),

  body("paymentMethod")
    .isIn(["cash", "card", "bank_transfer", "qr_code"])
    .withMessage("Invalid payment method"),

  body("discount")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount must be between 0 and 100"),

  body("tax")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Tax cannot be negative"),

  body("notes")
    .optional()
    .trim()
    .isString()
    .withMessage("Notes must be a string"),

  body("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)"),
];

exports.updateInvoiceValidator = [
  body("paymentStatus")
    .optional()
    .isIn(["pending", "paid", "cancelled"])
    .withMessage("Invalid payment status"),

  body("notes")
    .optional()
    .trim()
    .isString()
    .withMessage("Notes must be a string"),

  body("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)"),
];

exports.updatePaymentStatusValidator = [
  body("paymentStatus")
    .notEmpty()
    .withMessage("Payment status is required")
    .isIn(["pending", "paid", "cancelled"])
    .withMessage("Invalid payment status"),
];
