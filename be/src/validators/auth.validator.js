// src/validators/auth.validator.js
const { body } = require("express-validator");

// Chuẩn hóa và validate thông tin cơ bản của user
const userBaseValidator = [
  // Username validation
  body("username")
    .trim()
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, or underscores")
    .toLowerCase(),

  // Email validation
  body("email")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail()
    .toLowerCase(),

  // Name validation
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ max: 50 })
    .withMessage("First name cannot be more than 50 characters")
    .matches(/^[a-zA-ZÀ-ỹ\s]+$/)
    .withMessage("First name can only contain letters and spaces"),

  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ max: 50 })
    .withMessage("Last name cannot be more than 50 characters")
    .matches(/^[a-zA-ZÀ-ỹ\s]+$/)
    .withMessage("Last name can only contain letters and spaces"),

  // Optional fields validation
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format")
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      const minDate = new Date().setFullYear(now.getFullYear() - 100);
      if (date > now || date < minDate) {
        throw new Error("Invalid date of birth");
      }
      return true;
    }),

  body("gender")
    .optional()
    .isIn(["male", "female", "other"])
    .withMessage("Invalid gender specified"),

  body("phone")
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage("Invalid phone number format"),

  // Address validation
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
];

// Registration validation
exports.registerValidator = [
  ...userBaseValidator,
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/\d/)
    .withMessage("Password must contain at least one number")
    .matches(/[a-zA-Z]/)
    .withMessage("Password must contain at least one letter"),

  body("role")
    .optional()
    .isIn(["admin", "user"])
    .withMessage("Invalid role specified"),
];

// Login validation
exports.loginValidator = [
  body("login").trim().notEmpty().withMessage("Username or email is required"),

  body("password").notEmpty().withMessage("Password is required"),
];

// Password change validation
exports.changePasswordValidator = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long")
    .matches(/\d/)
    .withMessage("New password must contain at least one number")
    .matches(/[a-zA-Z]/)
    .withMessage("New password must contain at least one letter")
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error("New password must be different from current password");
      }
      return true;
    }),
];

// Refresh token validation
exports.refreshTokenValidator = [
  body("refreshToken").notEmpty().withMessage("Refresh token is required"),
];
