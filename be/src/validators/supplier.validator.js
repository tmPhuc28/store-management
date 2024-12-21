const { body } = require("express-validator");

// Bank info validation rules
const bankInfoValidationRules = [
  body("bankInfo.bankName")
    .if(body("bankInfo").exists())
    .notEmpty()
    .withMessage("Bank name is required")
    .trim(),

  body("bankInfo.accountNumber")
    .if(body("bankInfo").exists())
    .notEmpty()
    .withMessage("Account number is required")
    .trim()
    .matches(/^\d{8,19}$/)
    .withMessage("Account number must be 8-19 digits"),

  body("bankInfo.accountName")
    .if(body("bankInfo").exists())
    .notEmpty()
    .withMessage("Account name is required")
    .trim(),

  body("bankInfo.branch")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Branch name cannot exceed 100 characters"),
];

exports.createSupplierValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Supplier name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot be more than 100 characters"),

  body("code")
    .trim()
    .notEmpty()
    .withMessage("Supplier code is required")
    .matches(/^[A-Za-z0-9-]+$/)
    .withMessage("Code can only contain letters, numbers, and hyphens")
    .isLength({ max: 20 })
    .withMessage("Code cannot be more than 20 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot be more than 500 characters"),

  body("phone")
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage("Invalid phone number format"),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  body("website").optional().trim().isURL().withMessage("Invalid website URL"),

  body("taxCode")
    .optional()
    .trim()
    .matches(/^[0-9]{10,13}$/)
    .withMessage("Invalid tax code format"),

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
    .withMessage("Ward cannot exceed 100 characters"),

  body("address.district")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("District cannot exceed 100 characters"),

  body("address.province")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Province cannot exceed 100 characters"),

  body("contacts")
    .optional()
    .isArray()
    .withMessage("Contacts must be an array"),

  body("contacts.*.name")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Contact name cannot exceed 100 characters"),

  body("contacts.*.email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid contact email format")
    .normalizeEmail(),

  body("contacts.*.phone")
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage("Invalid contact phone number format"),

  body("contacts.*.position")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Contact position cannot exceed 100 characters"),

  body("bankInfo")
    .optional()
    .isObject()
    .withMessage("Bank info must be an object"),

  ...bankInfoValidationRules,

  body("paymentTerms")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Payment terms cannot exceed 200 characters"),

  body("logo").optional().trim().isURL().withMessage("Invalid logo URL"),

  body("status")
    .optional()
    .isIn([0, 1])
    .withMessage("Status must be either 0 (inactive) or 1 (active)")
    .toInt(),
];

exports.updateSupplierValidator = [
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

  ...exports.createSupplierValidator.slice(2),
];
