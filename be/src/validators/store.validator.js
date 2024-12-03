// store.validator.js
const { body } = require("express-validator");

exports.updateStoreValidator = [
  // Store information
  body("name")
    .notEmpty()
    .withMessage("Store name is required")
    .trim()
    .isLength({ max: 100 })
    .withMessage("Store name cannot exceed 100 characters"),

  body("phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage("Invalid phone number format"),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  // Address validation
  body("address.detail")
    .notEmpty()
    .withMessage("Address detail is required")
    .trim(),

  body("address.ward").optional().trim(),

  body("address.district").optional().trim(),

  body("address.province").optional().trim(),

  // Tax code validation
  body("taxCode")
    .optional()
    .trim()
    .matches(/^[0-9]{10,13}$/)
    .withMessage("Invalid tax code format"),
];

exports.validateBankInfo = [
  body("bankId").notEmpty().withMessage("Bank ID is required"),

  body("accountNumber")
    .notEmpty()
    .withMessage("Account number is required")
    .matches(/^\d{8,19}$/)
    .withMessage("Account number must be 8-19 digits"),

  body("accountName").notEmpty().withMessage("Account name is required").trim(),
];
