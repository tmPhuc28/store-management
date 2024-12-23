const { body } = require("express-validator");

// Zone validation rules
const zoneValidationRules = [
  body("zone.warehouse")
    .trim()
    .notEmpty()
    .withMessage("Warehouse is required")
    .isLength({ max: 50 })
    .withMessage("Warehouse cannot exceed 50 characters"),

  body("zone.area")
    .trim()
    .notEmpty()
    .withMessage("Area is required")
    .isLength({ max: 50 })
    .withMessage("Area cannot exceed 50 characters"),

  body("zone.rack")
    .trim()
    .notEmpty()
    .withMessage("Rack is required")
    .isLength({ max: 50 })
    .withMessage("Rack cannot exceed 50 characters"),

  body("zone.shelf")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Shelf cannot exceed 50 characters"),

  body("zone.bin")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Bin cannot exceed 50 characters"),
];

exports.createProductLocationValidator = [
  body("product")
    .notEmpty()
    .withMessage("Product is required")
    .isMongoId()
    .withMessage("Invalid product ID"),

  ...zoneValidationRules,

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Notes cannot exceed 200 characters"),

  body("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)")
    .toInt(),
];

exports.updateProductLocationValidator = [
  body("product").optional().isMongoId().withMessage("Invalid product ID"),

  ...zoneValidationRules.map((rule) => rule.optional()),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Notes cannot exceed 200 characters"),

  body("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)")
    .toInt(),
];
