// src/validators/common.validator.js
const { body, param, query } = require("express-validator");

// Status validation helper
exports.statusValidator = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)")
    .toInt(),
];

// Pagination validation helper
exports.paginationValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),
];

// MongoDB ObjectId validation helper
exports.objectIdValidator = (paramName = "id") =>
  param(paramName).isMongoId().withMessage("Invalid ID format");

// Sort validation helper
exports.sortValidator = query("sortBy")
  .optional()
  .matches(/^-?[a-zA-Z]+$/)
  .withMessage("Invalid sort format. Use fieldName or -fieldName");

// Search validation helper
exports.searchValidator = query("search")
  .optional()
  .trim()
  .isLength({ min: 1 })
  .withMessage("Search term cannot be empty if provided")
  .isLength({ max: 100 })
  .withMessage("Search term too long")
  .escape();

// Date range validation helper
exports.dateRangeValidator = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid start date format"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid end date format")
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate < req.query.startDate) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),
];

// Validation result checker middleware
exports.validate = (validations) => {
  return async (req, res, next) => {
    for (let validation of validations) {
      const result = await validation.run(req);
      if (result.errors.length) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  };
};
