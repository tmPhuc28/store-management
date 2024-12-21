// src/validators/payment.validator.js
const { body } = require("express-validator");

exports.validateBankInfo = [
  body("bankId").notEmpty().withMessage("Bank ID is required").trim(),

  body("accountNumber")
    .notEmpty()
    .withMessage("Account number is required")
    .matches(/^\d{8,19}$/)
    .withMessage("Account number must be 8-19 digits"),

  body("accountName").notEmpty().withMessage("Account name is required").trim(),
];

exports.validateQRGeneration = [
  body("bankInfo")
    .notEmpty()
    .withMessage("Bank information is required")
    .isObject()
    .withMessage("Bank information must be an object"),

  body("bankInfo.bankId").notEmpty().withMessage("Bank ID is required").trim(),

  body("bankInfo.accountNumber")
    .notEmpty()
    .withMessage("Account number is required")
    .matches(/^\d{8,19}$/)
    .withMessage("Account number must be 8-19 digits"),

  body("bankInfo.accountName")
    .notEmpty()
    .withMessage("Account name is required")
    .trim(),

  body("amount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Amount must be a positive number"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Description cannot exceed 255 characters"),

  body("template")
    .optional()
    .isIn(["compact", "compact2"])
    .withMessage("Invalid template format"),
];

exports.validateQRUrl = [
  body("url")
    .notEmpty()
    .withMessage("QR URL is required")
    .isURL()
    .withMessage("Invalid URL format")
    .matches(/^https:\/\/img\.vietqr\.io\/image\//)
    .withMessage("Invalid VietQR URL format"),
];
