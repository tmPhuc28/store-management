const { body } = require("express-validator");

// Specification validation helper
const validateSpecifications = (value) => {
  if (!value || typeof value !== "object") {
    throw new Error("Specifications must be an object");
  }

  Object.entries(value).forEach(([key, val]) => {
    if (typeof key !== "string" || key.length === 0) {
      throw new Error("Specification keys must be non-empty strings");
    }
    if (typeof val !== "string") {
      throw new Error("Specification values must be strings");
    }
  });

  return true;
};

// Image validation rules
const imageValidationRules = [
  body("images").optional().isArray().withMessage("Images must be an array"),

  body("images.*.url")
    .notEmpty()
    .withMessage("Image URL is required")
    .isURL()
    .withMessage("Invalid image URL"),

  body("images.*.isThumbnail")
    .optional()
    .isBoolean()
    .withMessage("isThumbnail must be a boolean"),

  body("images.*.order")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Image order must be a non-negative integer"),
];

// Warranty validation rules
const warrantyValidationRules = [
  body("warranty")
    .optional()
    .isObject()
    .withMessage("Warranty must be an object"),

  body("warranty.duration")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Warranty duration must be a non-negative integer"),

  body("warranty.unit")
    .optional()
    .isIn(["days", "months", "years"])
    .withMessage("Invalid warranty unit"),

  body("warranty.description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Warranty description cannot exceed 500 characters"),
];

exports.createProductValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot be more than 100 characters"),

  body("code")
    .trim()
    .notEmpty()
    .withMessage("Product code is required")
    .matches(/^[A-Za-z0-9-]+$/)
    .withMessage("Code can only contain letters, numbers, and hyphens")
    .isLength({ max: 20 })
    .withMessage("Code cannot be more than 20 characters"),

  body("sku")
    .trim()
    .notEmpty()
    .withMessage("SKU is required")
    .matches(/^[A-Za-z0-9-]+$/)
    .withMessage("SKU can only contain letters, numbers, and hyphens")
    .isLength({ max: 50 })
    .withMessage("SKU cannot be more than 50 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot be more than 2000 characters"),

  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isMongoId()
    .withMessage("Invalid category ID"),

  body("manufacturer")
    .optional()
    .isMongoId()
    .withMessage("Invalid manufacturer ID"),

  body("supplier").optional().isMongoId().withMessage("Invalid supplier ID"),

  body("basePrice")
    .notEmpty()
    .withMessage("Base price is required")
    .isFloat({ min: 0 })
    .withMessage("Base price must be a positive number"),

  body("minQuantity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Minimum quantity must be a non-negative integer"),

  body("maxQuantity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Maximum quantity must be a non-negative integer")
    .custom((value, { req }) => {
      if (
        value !== null &&
        req.body.minQuantity &&
        value < req.body.minQuantity
      ) {
        throw new Error(
          "Maximum quantity must be greater than minimum quantity"
        );
      }
      return true;
    }),

  body("unit")
    .trim()
    .notEmpty()
    .withMessage("Unit is required")
    .isLength({ max: 20 })
    .withMessage("Unit cannot be more than 20 characters"),

  body("variantOptions")
    .optional()
    .isArray()
    .withMessage("Variant options must be an array"),

  body("variantOptions.*.name")
    .if(body("variantOptions").exists())
    .notEmpty()
    .withMessage("Variant option name is required")
    .trim(),

  body("variantOptions.*.values")
    .if(body("variantOptions").exists())
    .isArray()
    .withMessage("Variant option values must be an array")
    .notEmpty()
    .withMessage("Variant option values cannot be empty"),

  ...imageValidationRules,

  body("specifications").optional().custom(validateSpecifications),

  ...warrantyValidationRules,

  body("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)")
    .toInt(),
];

exports.updateProductValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Name cannot be more than 100 characters"),

  body("code")
    .optional()
    .trim()
    .matches(/^[A-Za-z0-9-]+$/)
    .withMessage("Code can only contain letters, numbers, and hyphens")
    .isLength({ max: 20 })
    .withMessage("Code cannot be more than 20 characters"),

  body("sku")
    .optional()
    .trim()
    .matches(/^[A-Za-z0-9-]+$/)
    .withMessage("SKU can only contain letters, numbers, and hyphens")
    .isLength({ max: 50 })
    .withMessage("SKU cannot be more than 50 characters"),

  // Include other fields from createProductValidator but make them optional
  ...exports.createProductValidator.slice(3),
];

// Discount validation
exports.discountValidator = [
  body("code")
    .notEmpty()
    .withMessage("Discount Code is required")
    .isMongoId()
    .withMessage("Invalid discount Code"),
];

// Discontinue validation
exports.discontinueValidator = [
  body("reason")
    .notEmpty()
    .withMessage("Reason is required")
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters"),

  body("effectiveDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format")
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error("Effective date cannot be in the past");
      }
      return true;
    }),
];

// Update specifications validation
exports.updateSpecificationsValidator = [
  body()
    .isObject()
    .withMessage("Request body must be an object")
    .custom(validateSpecifications),
];

// Update images validation
exports.updateImagesValidator = [
  body().isArray().withMessage("Request body must be an array"),
  ...imageValidationRules.map((rule) => rule.optional()),
];

// Quantity adjustment validation
exports.adjustQuantityValidator = [
  body("adjustment")
    .notEmpty()
    .withMessage("Adjustment value is required")
    .isInt()
    .withMessage("Adjustment must be an integer"),

  body("reason")
    .notEmpty()
    .withMessage("Reason is required")
    .trim()
    .isLength({ max: 200 })
    .withMessage("Reason cannot exceed 200 characters"),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),
];

// Quantity adjustment validation
exports.pricesValidator = [
  body("importPrice")
    .notEmpty()
    .withMessage("ImportPrice value is required")
    .isInt()
    .withMessage("ImportPrice must be an integer"),

  body("sellingPrice")
    .notEmpty()
    .withMessage("SellingPrice value is required")
    .isInt()
    .withMessage("SellingPrice must be an integer"),
];

// Quantity adjustment validation
exports.quantityValidator = [
  body("quantity")
    .notEmpty()
    .withMessage("Quantity value is required")
    .isInt()
    .withMessage("Quantity must be an integer"),
];
