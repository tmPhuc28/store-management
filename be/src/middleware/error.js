// src/middleware/error.js
const { logAction } = require("../utils/logger");
const systemLog = logAction("System");

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  systemLog.error("System error occurred", error, {
    url: req.originalUrl,
    method: req.method,
    user: req.user?._id,
  });

  if (err.name === "CastError") {
    error = new Error("Resource not found");
    error.statusCode = 404;
  }

  if (err.code === 11000) {
    error = new Error("Duplicate field value entered");
    error.statusCode = 400;
  }

  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message);
    error = new Error(message);
    error.statusCode = 400;
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || "Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

module.exports = errorHandler;
