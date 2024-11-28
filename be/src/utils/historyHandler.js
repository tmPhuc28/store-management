// src/utils/historyHandler.js

/**
 * Tạo bản ghi lịch sử
 * @param {Object} user - User thực hiện thay đổi
 * @param {Object} changes - Các thay đổi
 * @param {string} action - Hành động thực hiện
 */
const createHistoryRecord = (user, changes, action = "update") => {
  return {
    updatedBy: user._id,
    timestamp: new Date(),
    action,
    changes: sanitizeChanges(changes),
  };
};

/**
 * Loại bỏ các trường không cần thiết khỏi changes
 */
const sanitizeChanges = (changes) => {
  const sanitized = { ...changes };
  delete sanitized.updateHistory;
  delete sanitized.__v;
  delete sanitized.createdAt;
  delete sanitized.updatedAt;
  return sanitized;
};

/**
 * Merge history mới với history cũ
 */
const mergeHistory = (oldHistory = [], newRecord) => {
  return [...oldHistory, newRecord];
};

module.exports = {
  createHistoryRecord,
  mergeHistory,
};
