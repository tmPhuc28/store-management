// src/validators/store.validator.js
const { body } = require("express-validator");
const { isSupportedBank } = require("../utils/bankValidator");

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

  body("bankInfo.bankId")
    .notEmpty()
    .withMessage("Bank ID is required")
    .custom((value) => {
      if (!isSupportedBank(value)) {
        throw new Error("Selected bank is not supported for VietQR");
      }
      return true;
    }),

  body("bankInfo.accountNumber")
    .notEmpty()
    .withMessage("Account number is required")
    .matches(/^[0-9]{8,19}$/)
    .withMessage("Account number must be 8-19 digits"),

  body("bankInfo.accountName")
    .notEmpty()
    .withMessage("Account name is required")
    .trim()
    .isLength({ max: 100 })
    .withMessage("Account name cannot exceed 100 characters"),

  body("bankInfo.template")
    .optional()
    .isIn(["compact", "compact2", "qr_only", "print"])
    .withMessage("Invalid template format"),
];
