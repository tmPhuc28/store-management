// src/validators/user.validator.js
const { body } = require("express-validator");

// User update validation
exports.updateUserValidator = [
  body("firstName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("First name cannot be empty if provided")
    .isLength({ max: 50 })
    .withMessage("First name cannot be more than 50 characters")
    .matches(/^[a-zA-ZÀ-ỹ\s]+$/)
    .withMessage("First name can only contain letters and spaces"),

  body("lastName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Last name cannot be empty if provided")
    .isLength({ max: 50 })
    .withMessage("Last name cannot be more than 50 characters")
    .matches(/^[a-zA-ZÀ-ỹ\s]+$/)
    .withMessage("Last name can only contain letters and spaces"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail()
    .toLowerCase(),

  body("phone")
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage("Please provide a valid phone number"),

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

  body("address")
    .optional()
    .isObject()
    .withMessage("Address must be an object"),

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

  body("role")
    .optional()
    .isIn(["admin", "user"])
    .withMessage("Invalid role specified"),
];

// Custom validation middleware
exports.validateUserUpdate = async (req, res, next) => {
  try {
    // Prevent updating sensitive fields directly
    const sensitiveFields = [
      "password",
      "refreshTokens",
      "resetPasswordToken",
      "resetPasswordExpire",
    ];
    const updates = Object.keys(req.body);

    const hasInvalidFields = updates.some((field) =>
      sensitiveFields.includes(field)
    );
    if (hasInvalidFields) {
      return res.status(400).json({
        success: false,
        message: "Cannot update sensitive fields through this endpoint",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
