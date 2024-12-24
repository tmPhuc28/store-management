// src/middleware/validateRequest.js
const { validationResult } = require("express-validator");

/**
 * Base middleware để validate request
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

module.exports = {
  validateRequest,
};
