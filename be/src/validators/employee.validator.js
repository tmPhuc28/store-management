// src/validators/employee.validator.js
const { body } = require("express-validator");

exports.createEmployeeValidator = [
  // Required fields
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ max: 50 })
    .withMessage("First name cannot exceed 50 characters"),

  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ max: 50 })
    .withMessage("Last name cannot exceed 50 characters"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage("Invalid phone number format"),

  // Optional fields

  body("dateOfBirth").optional().isISO8601().withMessage("Invalid date format"),

  body("gender")
    .optional()
    .isIn(["male", "female", "other"])
    .withMessage("Invalid gender"),

  body("address")
    .optional()
    .isObject()
    .withMessage("Address must be an object"),

  body("address.detail")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Address detail cannot exceed 200 characters"),

  body("position")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Position cannot exceed 100 characters"),

  body("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)")
    .toInt(),
];

exports.updateEmployeeValidator = [
  // Optional fields but with validation if provided
  body("firstName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("First name cannot be empty if provided")
    .isLength({ max: 50 })
    .withMessage("First name cannot exceed 50 characters"),

  body("lastName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Last name cannot be empty if provided")
    .isLength({ max: 50 })
    .withMessage("Last name cannot exceed 50 characters"),

  body("phone")
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage("Invalid phone number format"),

  // Rest are same as create validator

  body("dateOfBirth").optional().isISO8601().withMessage("Invalid date format"),

  body("gender")
    .optional()
    .isIn(["male", "female", "other"])
    .withMessage("Invalid gender"),

  body("position")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Position cannot exceed 100 characters"),

  body("address")
    .optional()
    .isObject()
    .withMessage("Address must be an object"),
];
