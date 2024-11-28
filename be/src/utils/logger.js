// src/utils/logger.js
const winston = require("winston");
const path = require("path");

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta,
      });
    })
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, "../../logs/error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(__dirname, "../../logs/action.log"),
      level: "info",
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

// Các hàm tiện ích để log
const logAction = (action) => ({
  success: (message, meta = {}) => {
    logger.info({ action, status: "success", message, ...meta });
  },
  error: (message, error, meta = {}) => {
    logger.error({
      action,
      status: "error",
      message,
      error: error.message,
      stack: error.stack,
      ...meta,
    });
  },
});

module.exports = {
  logger,
  logAction,
};
