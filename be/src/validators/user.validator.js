// src/validators/user.validator.js
const { body } = require("express-validator");

// Validator for protected fields
const protectedFieldsValidator = body(
  "status",
  "refreshTokens",
  "resetPasswordToken",
  "resetPasswordExpire",
  "passwordChangedAt",
  "lastLogin",
  "updateHistory",
  "createdAt",
  "updatedAt",
  "__v"
)
  .not()
  .exists()
  .withMessage("Cannot modify protected fields through this endpoint");

// User update validation
exports.updateUserValidator = [
  body("username")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Username cannot be empty if provided")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers and underscore"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail()
    .toLowerCase(),

  body("role")
    .optional()
    .isIn([0, 1])
    .withMessage("Invalid role value")
    .toInt(),

  body("employee")
    .optional()
    .isMongoId()
    .withMessage("Invalid employee ID format"),

  protectedFieldsValidator,
];

// User create validation
exports.createUserValidator = [
  body("username")
    .notEmpty()
    .trim()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers and underscore"),

  body("email")
    .notEmpty()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/\d/)
    .withMessage("Password must contain at least one number")
    .matches(/[a-zA-Z]/)
    .withMessage("Password must contain at least one letter")
    .not()
    .equals("password123")
    .withMessage("Password is too common"),

  body("role")
    .optional()
    .isIn([0, 1])
    .withMessage("Invalid role value")
    .toInt(),

  protectedFieldsValidator,
];
