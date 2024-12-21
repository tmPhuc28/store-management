// src/validators/user.validator.js
const { body } = require("express-validator");

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

  body("role")
    .optional()
    .isIn([0, 1])
    .withMessage("Invalid role value")
    .toInt(),

  body("employee")
    .optional()
    .isMongoId()
    .withMessage("Invalid employee ID format"),

  // Prevent updating sensitive fields
  body([
    "password",
    "refreshTokens",
    "resetPasswordToken",
    "resetPasswordExpire",
  ])
    .not()
    .exists()
    .withMessage("Cannot update sensitive fields through this endpoint"),
];

// Custom validation middleware
exports.validateUserUpdate = async (req, res, next) => {
  try {
    // Additional custom validations if needed
    next();
  } catch (error) {
    next(error);
  }
};
