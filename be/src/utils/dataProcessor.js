// src/utils/dataProcessor.js
/**
 * Module xử lý và chuyển đổi dữ liệu tập trung
 * @module dataProcessor
 */

/**
 * Process and sanitize input data
 */
const processData = (data, options = {}) => {
  const {
    nullableFields = [],
    protectedFields = [],
    allowedFields = [],
  } = options;

  const processedData = {};
  const inputFields = Object.keys(data);

  // Log attempted protected field updates if any
  const attemptedProtectedFields = inputFields.filter((field) =>
    protectedFields.includes(field)
  );

  if (attemptedProtectedFields.length > 0) {
    console.warn(
      `Attempt to modify protected fields: ${attemptedProtectedFields.join(
        ", "
      )}`
    );
  }

  // Filter and process fields
  inputFields.forEach((field) => {
    // Skip protected fields
    if (protectedFields.includes(field)) {
      return;
    }

    // Only include allowed fields if specified
    if (allowedFields.length > 0 && !allowedFields.includes(field)) {
      return;
    }

    // Handle null values
    if (data[field] === null) {
      if (nullableFields.includes(field)) {
        processedData[field] = null;
      }
      return;
    }

    // Include valid data
    if (data[field] !== undefined) {
      processedData[field] = data[field];
    }
  });

  return processedData;
};

/**
 * Xử lý dữ liệu trả về
 * Chuyển đổi Mongoose documents thành plain objects và loại bỏ các trường không mong muốn
 *
 * @param {Document|Document[]|Object|Object[]} data - Dữ liệu cần xử lý
 * @param {Array<string>} excludeFields - Các trường cần loại bỏ khỏi kết quả
 * @returns {Object|Object[]|null} Dữ liệu đã được xử lý
 */
const processResponse = (data, excludeFields = []) => {
  if (!data) return null;

  // Xử lý mảng
  if (Array.isArray(data)) {
    return data.map((item) => processResponse(item, excludeFields));
  }

  // Xử lý Mongoose document
  if (data.toObject) {
    const obj = data.toObject({ getters: true });
    excludeFields.forEach((field) => delete obj[field]);
    return obj;
  }

  // Xử lý plain object
  const obj = { ...data };
  excludeFields.forEach((field) => delete obj[field]);
  return obj;
};

/**
 * Xử lý dữ liệu phân cấp (nested)
 * Cho phép xử lý các object lồng nhau với các cấu hình khác nhau
 *
 * @param {Object} data - Dữ liệu cần xử lý
 * @param {Object} config - Cấu hình xử lý cho từng trường nested
 * @returns {Object} Dữ liệu đã được xử lý
 *
 * @example
 * const data = {
 *   user: { name: 'John', password: '123' },
 *   address: { street: '', city: 'NY' }
 * };
 * const config = {
 *   user: { protectedFields: ['password'] },
 *   address: { nullableFields: ['street'] }
 * };
 */
const processNestedData = (data, config = {}) => {
  const processed = { ...data };

  Object.entries(config).forEach(([field, fieldConfig]) => {
    if (processed[field] && typeof processed[field] === "object") {
      processed[field] = processData(processed[field], fieldConfig);
    }
  });

  return processed;
};

/**
 * Xử lý dữ liệu theo schema (validation schema, DTO,...)
 * Chỉ cho phép các trường được định nghĩa trong schema
 *
 * @param {Object} data - Dữ liệu cần xử lý
 * @param {Object} schema - Schema định nghĩa cấu trúc dữ liệu hợp lệ
 * @returns {Object} Dữ liệu đã được xử lý theo schema
 */
const sanitizeBySchema = (data, schema) => {
  const sanitized = {};

  Object.keys(schema).forEach((key) => {
    if (key in data) {
      const fieldSchema = schema[key];

      // Xử lý theo type của schema nếu được định nghĩa
      if (fieldSchema.type === "string" && typeof data[key] === "string") {
        sanitized[key] = data[key].trim();
      } else {
        sanitized[key] = data[key];
      }
    }
  });

  return sanitized;
};

module.exports = {
  processData,
  processResponse,
  processNestedData,
  sanitizeBySchema,
};
