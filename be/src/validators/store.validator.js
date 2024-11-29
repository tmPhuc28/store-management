// src/validators/store.validator.js
const { body } = require("express-validator");

exports.updateStoreValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Store name is required")
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

  body("address.detail")
    .notEmpty()
    .withMessage("Address detail is required")
    .trim(),

  body("address.ward").optional().trim(),

  body("address.district").optional().trim(),

  body("address.province").optional().trim(),

  body("taxCode")
    .optional()
    .trim()
    .matches(/^[0-9-]*$/)
    .withMessage("Invalid tax code format"),

  body("bankAccount")
    .notEmpty()
    .withMessage("Bank account number is required")
    .matches(/^[0-9-]*$/)
    .withMessage("Invalid bank account number"),

  body("bankName").notEmpty().withMessage("Bank name is required").trim(),

  body("accountName").notEmpty().withMessage("Account name is required").trim(),
];
