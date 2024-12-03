// src/validators/bank.validator.js
const { body } = require("express-validator");

exports.validateBankInfo = [
  body("bankInfo.bankId").notEmpty().withMessage("Bank ID is required"),

  body("bankInfo.accountNumber")
    .notEmpty()
    .withMessage("Account number is required")
    .matches(/^\d{8,19}$/)
    .withMessage("Account number must be 8-19 digits"),

  body("bankInfo.accountName")
    .notEmpty()
    .withMessage("Account name is required")
    .trim(),
];
