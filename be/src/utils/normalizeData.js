// src/utils/normalizeData.js
/**
 * Chuẩn hóa các trường nullable trong đối tượng
 * @param {Object} data - Đối tượng cần chuẩn hóa
 * @param {Array<string>} nullableFields - Mảng chứa tên các trường có thể null
 * @returns {Object} Đối tượng đã được chuẩn hóa
 */
const normalizeData = (data, nullableFields) => {
  const normalized = { ...data };

  nullableFields.forEach((field) => {
    if (field in normalized) {
      normalized[field] =
        normalized[field] === "" || normalized[field] === undefined
          ? null
          : normalized[field];
    }
  });

  return normalized;
};

module.exports = normalizeData;
