// src/utils/duplicateCheck.js

/**
 * Kiểm tra dữ liệu trùng lặp
 * @param {Model} Model - Mongoose model cần kiểm tra
 * @param {Object} conditions - Điều kiện tìm kiếm
 * @param {string} excludeId - ID cần loại trừ (dùng cho update)
 * @param {string} message - Thông báo lỗi tùy chỉnh
 */
const checkDuplicate = async (
  Model,
  conditions,
  excludeId = null,
  message = null
) => {
  const query = {
    ...conditions,
    status: 1,
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const exists = await Model.findOne(query);

  if (exists) {
    throw new Error(
      message ||
        `Active ${Model.modelName} with the same ${conditions} already exists`
    );
  }

  return true;
};

module.exports = { checkDuplicate };
