const { body, query } = require("express-validator");
const {
  INVOICE_STATES,
  PAYMENT_METHODS,
} = require("../constants/invoice.constants");

// Validate create invoice
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
    .isIn(Object.values(PAYMENT_METHODS))
    .withMessage("Invalid payment method"),

  // Optional discount code
  body("discountCode")
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Discount code must be between 3 and 20 characters"),

  // Optional notes
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),

  // Bank transfer specific validation
  body("bankTransferInfo")
    .if(body("paymentMethod").equals(PAYMENT_METHODS.BANK_TRANSFER))
    .optional()
    .isObject()
    .withMessage("Bank transfer info must be an object"),
];

// Validate status update
exports.updateStatusValidator = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(Object.values(INVOICE_STATES))
    .withMessage("Invalid status"),

  body("reason")
    .if(body("status").isIn([INVOICE_STATES.CANCELED, INVOICE_STATES.REFUNDED]))
    .notEmpty()
    .withMessage("Reason is required for cancellation/refund")
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage("Reason must be between 3 and 500 characters"),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),
];

// Validate payment confirmation
exports.confirmPaymentValidator = [
  body("amount")
    .notEmpty()
    .withMessage("Payment amount is required")
    .isFloat({ min: 0 })
    .withMessage("Amount must be greater than 0"),

  body("transactionId")
    .if(body("paymentMethod").equals(PAYMENT_METHODS.BANK_TRANSFER))
    .notEmpty()
    .withMessage("Transaction ID is required for bank transfer")
    .matches(/^[A-Za-z0-9]{6,20}$/)
    .withMessage("Invalid transaction ID format"),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),
];

// Validate refund
exports.refundValidator = [
  body("refundAmount")
    .notEmpty()
    .withMessage("Refund amount is required")
    .isFloat({ min: 0 })
    .withMessage("Refund amount must be greater than 0"),

  body("reason")
    .notEmpty()
    .withMessage("Refund reason is required")
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage("Reason must be between 3 and 500 characters"),

  body("refundMethod")
    .notEmpty()
    .withMessage("Refund method is required")
    .isIn(["cash", "bank_transfer"])
    .withMessage("Invalid refund method"),

  body("bankInfo")
    .if(body("refundMethod").equals("bank_transfer"))
    .notEmpty()
    .withMessage("Bank information is required for bank transfer refund")
    .isObject()
    .withMessage("Bank information must be an object"),
];

// Validate list query parameters
exports.getInvoicesValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("status")
    .optional()
    .isIn(Object.values(INVOICE_STATES))
    .withMessage("Invalid status"),

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

  query("customer").optional().isMongoId().withMessage("Invalid customer ID"),
];

// Validate statistics query
exports.statisticsValidator = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid start date format"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid end date format"),

  query("type")
    .optional()
    .isIn(["daily", "monthly", "payment_methods", "top_products"])
    .withMessage("Invalid statistics type"),
];
