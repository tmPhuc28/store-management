// src/validators/customer.validator.js
const { body } = require("express-validator");

exports.createCustomerValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Customer name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage("Invalid phone number format")
    .isLength({ min: 10, max: 15 })
    .withMessage("Phone number must be between 10 and 15 characters"),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  body("address.detail")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Address detail cannot exceed 200 characters"),

  body("address.ward")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Ward name cannot exceed 100 characters"),

  body("address.district")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("District name cannot exceed 100 characters"),

  body("address.province")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Province name cannot exceed 100 characters"),

  body("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)")
    .toInt(),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),
];

exports.updateCustomerValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty if provided")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("phone")
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage("Invalid phone number format")
    .isLength({ min: 10, max: 15 })
    .withMessage("Phone number must be between 10 and 15 characters"),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  body("address.detail")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Address detail cannot exceed 200 characters"),

  body("address.ward")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Ward name cannot exceed 100 characters"),

  body("address.district")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("District name cannot exceed 100 characters"),

  body("address.province")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Province name cannot exceed 100 characters"),

  body("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)")
    .toInt(),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),
];
