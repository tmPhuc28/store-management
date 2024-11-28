// src/validators/common.validator.js
const { body } = require("express-validator");

exports.statusValidator = body("status")
  .optional()
  .isIn([0, 1])
  .withMessage("Status must be either 0 (inactive) or 1 (active)")
  .toInt();
