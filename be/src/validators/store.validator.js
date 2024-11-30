// src/validators/store.validator.js
const { body } = require("express-validator");

exports.updateStoreValidator = [
  // Store name validation
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Store name is required")
    .isLength({ max: 100 })
    .withMessage("Store name cannot exceed 100 characters"),

  // Phone validation
  body("phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage("Please enter a valid phone number")
    .isLength({ min: 10, max: 15 })
    .withMessage("Phone number must be between 10 and 15 characters"),

  // Email validation (optional)
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),

  // Address validation
  body("address.detail")
    .notEmpty()
    .withMessage("Address detail is required")
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

  // Tax code validation (optional)
  body("taxCode")
    .optional()
    .trim()
    .matches(/^[0-9-]*$/)
    .withMessage("Invalid tax code format")
    .isLength({ min: 10, max: 14 })
    .withMessage("Tax code must be between 10 and 14 characters"),
];

// Helper function to validate full store data
exports.validateStoreData = async (data) => {
  const errors = [];

  // Required fields
  if (!data.name) errors.push("Store name is required");
  if (!data.phone) errors.push("Phone number is required");
  if (!data.address?.detail) errors.push("Address detail is required");

  // Phone format
  if (data.phone && !/^[0-9+\-\s()]*$/.test(data.phone)) {
    errors.push("Invalid phone number format");
  }

  // Email format
  if (
    data.email &&
    !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(data.email)
  ) {
    errors.push("Invalid email format");
  }

  // Tax code format
  if (data.taxCode && !/^[0-9-]*$/.test(data.taxCode)) {
    errors.push("Invalid tax code format");
  }

  return errors;
};
