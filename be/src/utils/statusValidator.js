// src/utils/statusValidator.js

/**
 * Kiểm tra việc thay đổi status của user
 * @param {Object} currentUser - User hiện tại cần thay đổi status
 * @param {Number} newStatus - Status mới
 * @param {Object} requestUser - User thực hiện request
 * @returns {Object} - { isValid: boolean, message: string }
 */
const validateUserStatusChange = (currentUser, newStatus, requestUser) => {
  // Kiểm tra nếu status mới giống status hiện tại
  if (currentUser.status === newStatus) {
    return {
      isValid: false,
      message: "New status is same as current status",
    };
  }

  // Kiểm tra giá trị status có hợp lệ
  if (![0, 1].includes(newStatus)) {
    return {
      isValid: false,
      message: "Status must be 0 (inactive) or 1 (active)",
    };
  }

  // Không được thay đổi status của chính mình
  if (currentUser._id.toString() === requestUser._id.toString()) {
    return {
      isValid: false,
      message: "Cannot change your own status",
    };
  }

  // Không được deactivate admin account
  if (currentUser.role === "admin" && newStatus === 0) {
    return {
      isValid: false,
      message: "Cannot deactivate admin account",
    };
  }

  return {
    isValid: true,
    message: "Status change is valid",
  };
};

/**
 * Kiểm tra việc thay đổi status của các đối tượng khác (product, category, customer,...)
 * @param {Object} currentObject - Đối tượng hiện tại
 * @param {Number} newStatus - Status mới
 * @returns {Object} - { isValid: boolean, message: string }
 */
const validateGeneralStatusChange = (currentObject, newStatus) => {
  // Kiểm tra giá trị status có hợp lệ
  if (![0, 1].includes(newStatus)) {
    return {
      isValid: false,
      message: "Status must be 0 (inactive) or 1 (active)",
    };
  }

  // Kiểm tra nếu status mới giống status hiện tại
  if (currentObject.status === newStatus) {
    return {
      isValid: false,
      message: "New status is same as current status",
    };
  }

  return {
    isValid: true,
    message: "Status change is valid",
  };
};

module.exports = {
  validateUserStatusChange,
  validateGeneralStatusChange,
};
