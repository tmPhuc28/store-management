const { body } = require("express-validator");

exports.createCategoryValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ max: 50 })
    .withMessage("Name cannot be more than 50 characters"),

  body("code")
    .trim()
    .notEmpty()
    .withMessage("Category code is required")
    .matches(/^[A-Za-z0-9-]+$/)
    .withMessage("Code can only contain letters, numbers, and hyphens")
    .isLength({ max: 20 })
    .withMessage("Code cannot be more than 20 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot be more than 500 characters"),

  body("parentCategory")
    .optional()
    .trim()
    .isMongoId()
    .withMessage("Invalid parent category ID"),

  body("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)")
    .toInt(),
];

exports.updateCategoryValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Name cannot be more than 50 characters"),

  body("code")
    .optional()
    .trim()
    .matches(/^[A-Za-z0-9-]+$/)
    .withMessage("Code can only contain letters, numbers, and hyphens")
    .isLength({ max: 20 })
    .withMessage("Code cannot be more than 20 characters"),

  ...exports.createCategoryValidator.slice(2),
];
