// src/validators/customer.validator.js
const { body } = require("express-validator");

exports.createCustomerValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Customer name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot be more than 100 characters"),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage("Please provide a valid phone number"),

  body("address.detail")
    .optional()
    .trim()
    .isString()
    .withMessage("Detail must be a string"),

  body("address.ward")
    .optional()
    .trim()
    .isString()
    .withMessage("Ward must be a string"),

  body("address.district")
    .optional()
    .trim()
    .isString()
    .withMessage("District must be a string"),

  body("address.province")
    .optional()
    .trim()
    .isString()
    .withMessage("Province must be a string"),

  body("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)")
    .toInt(),

  body("notes")
    .optional()
    .trim()
    .isString()
    .withMessage("Notes must be a string"),
];

exports.updateCustomerValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Name cannot be more than 100 characters"),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("phone")
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage("Please provide a valid phone number"),

  body("address")
    .optional()
    .isObject()
    .withMessage("Address must be an object"),

  body("address.detail")
    .optional()
    .trim()
    .isString()
    .withMessage("Detail must be a string"),

  body("address.ward")
    .optional()
    .trim()
    .isString()
    .withMessage("Ward must be a string"),

  body("address.district")
    .optional()
    .trim()
    .isString()
    .withMessage("District must be a string"),

  body("address.province")
    .optional()
    .trim()
    .isString()
    .withMessage("Province must be a string"),

  body("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)")
    .toInt(),

  body("notes")
    .optional()
    .trim()
    .isString()
    .withMessage("Notes must be a string"),
];
