// src/utils/responseHandler.js

class ResponseHandler {
  static success(data, message = null, statusCode = 200) {
    const response = {
      success: true,
      data,
    };

    if (message) {
      response.message = message;
    }

    return {
      statusCode,
      body: response,
    };
  }

  static error(error) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    const errors = error.errors || undefined;

    const response = {
      success: false,
      message,
    };

    if (errors) {
      response.errors = errors;
    }

    if (process.env.NODE_ENV === "development" && error.stack) {
      response.stack = error.stack;
    }

    return {
      statusCode,
      body: response,
    };
  }

  static paginate(data, total, page, limit) {
    return {
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = ResponseHandler;
