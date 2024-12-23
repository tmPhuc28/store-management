// src/validators/auth.validator.js
const { body } = require("express-validator");

/**
 * Common password validation rules
 */
const passwordRules = [
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
];

/**
 * Registration validation rules
 */
exports.registerValidator = [
  // Username validation
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers and underscore")
    .toLowerCase(),

  // Email validation
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail()
    .toLowerCase(),

  // Password validation
  ...passwordRules,

  // Role validation (optional)
  body("role")
    .optional()
    .isIn([0, 1])
    .withMessage("Invalid role specified")
    .toInt(),

  // Status validation (optional)
  body("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)")
    .toInt(),

  body([
    "employee",
    "refreshTokens",
    "resetPasswordToken",
    "resetPasswordExpire",
  ])
    .not()
    .exists()
    .withMessage("Cannot update sensitive fields through this endpoint"),
];

/**
 * Login validation rules
 */
exports.loginValidator = [
  // Login (username or email)
  body("login")
    .trim()
    .notEmpty()
    .withMessage("Username or email is required")
    .isLength({ min: 3 })
    .withMessage("Invalid login credentials"),

  // Password
  body("password").notEmpty().withMessage("Password is required"),
];

/**
 * Change password validation
 */
exports.changePasswordValidator = [
  // Current password
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  // New password
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long")
    .matches(/\d/)
    .withMessage("New password must contain at least one number")
    .matches(/[a-zA-Z]/)
    .withMessage("New password must contain at least one letter")
    .not()
    .equals("password123")
    .withMessage("Password is too common")
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error("New password must be different from current password");
      }
      return true;
    }),
];

/**
 * Refresh token validation
 */
exports.refreshTokenValidator = [
  body("refreshToken")
    .notEmpty()
    .withMessage("Refresh token is required")
    .isJWT()
    .withMessage("Invalid refresh token format"),
];

/**
 * Reset password request validation
 */
exports.resetPasswordRequestValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail()
    .toLowerCase(),
];

/**
 * Reset password validation
 */
exports.resetPasswordValidator = [
  body("token").notEmpty().withMessage("Reset token is required"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/\d/)
    .withMessage("Password must contain at least one number")
    .matches(/[a-zA-Z]/)
    .withMessage("Password must contain at least one letter"),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Password confirmation is required")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
];

/**
 * Validate email change
 */
exports.emailChangeValidator = [
  body("newEmail")
    .trim()
    .notEmpty()
    .withMessage("New email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail()
    .toLowerCase()
    .custom((value, { req }) => {
      if (value === req.user.email) {
        throw new Error("New email must be different from current email");
      }
      return true;
    }),

  body("password")
    .notEmpty()
    .withMessage("Password is required for verification"),
];

/**
 * Status update validation
 */
exports.statusUpdateValidator = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)")
    .toInt(),
];
