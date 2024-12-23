// src/utils/logger.js
const winston = require("winston");
const path = require("path");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, "../../logs/error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(__dirname, "../../logs/combined.log"),
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

const logAction = (action) => ({
  success: (message, meta = {}) => {
    logger.info({ action, status: "success", message, ...meta });
  },
  error: (message, error = null, meta = {}) => {
    const errorInfo = error
      ? {
          errorMessage: error.message || "Unknown error",
          stack: error.stack,
          ...error,
        }
      : null;

    logger.error({
      action,
      status: "error",
      message: message || "An error occurred",
      error: errorInfo,
      ...meta,
    });
  },
});

module.exports = {
  logger,
  logAction,
};
