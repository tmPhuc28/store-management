// src/validators/discount.validator.js
const { body } = require("express-validator");

exports.createDiscountValidator = [
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Vui lòng nhập mã giảm giá")
    .isLength({ min: 3, max: 20 })
    .withMessage("Mã giảm giá phải từ 3-20 ký tự")
    .matches(/^[A-Za-z0-9]+$/)
    .withMessage("Mã giảm giá chỉ được chứa chữ và số"),

  body("description").trim().notEmpty().withMessage("Vui lòng nhập mô tả"),

  body("type")
    .isIn(["percentage", "fixed"])
    .withMessage("Loại giảm giá không hợp lệ"),

  body("value")
    .isFloat({ min: 0 })
    .withMessage("Giá trị giảm giá không hợp lệ")
    .custom((value, { req }) => {
      if (req.body.type === "percentage" && value > 100) {
        throw new Error("Phần trăm giảm giá không thể vượt quá 100%");
      }
      return true;
    }),

  body("minOrderValue")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Giá trị đơn hàng tối thiểu không hợp lệ"),

  body("maxDiscount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Giá trị giảm tối đa không hợp lệ"),

  body("startDate")
    .isISO8601()
    .withMessage("Ngày bắt đầu không hợp lệ")
    .custom((value, { req }) => {
      if (new Date(value) < new Date()) {
        throw new Error("Ngày bắt đầu phải lớn hơn ngày hiện tại");
      }
      return true;
    }),

  body("endDate")
    .isISO8601()
    .withMessage("Ngày kết thúc không hợp lệ")
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error("Ngày kết thúc phải lớn hơn ngày bắt đầu");
      }
      return true;
    }),

  body("usageLimit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Giới hạn sử dụng phải là số nguyên dương"),
];

exports.validateDiscountCodeValidator = [
  body("code").trim().notEmpty().withMessage("Vui lòng nhập mã giảm giá"),

  body("orderValue")
    .isFloat({ min: 0 })
    .withMessage("Giá trị đơn hàng không hợp lệ"),
];

exports.updateDiscountStatusValidator = [
  body("status").isIn([0, 1]).withMessage("Trạng thái không hợp lệ"),
];
