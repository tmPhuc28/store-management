// src/controllers/discount.controller.js
const Discount = require("../models/Discount");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger");
const { validateGeneralStatusChange } = require("../utils/statusValidator");
// @desc    Get all discounts
// @route   GET /api/v1/discounts
// @access  Private/Admin
exports.getDiscounts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const status =
      req.query.status !== undefined ? parseInt(req.query.status) : undefined;

    let query = {};
    if (status !== undefined && (status === 0 || status === 1)) {
      query.status = status;
    }

    const total = await Discount.countDocuments(query);
    const discounts = await Discount.find(query)
      .populate("createdBy", "username email")
      .sort("-createdAt")
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: discounts.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: discounts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create discount
// @route   POST /api/v1/discounts
// @access  Private/Admin
exports.createDiscount = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if code already exists
    const existingDiscount = await Discount.findOne({
      code: req.body.code.toUpperCase(),
      status: 1,
    });

    if (existingDiscount) {
      return res.status(400).json({
        success: false,
        message: "Mã giảm giá này đã tồn tại",
      });
    }

    const discount = await Discount.create({
      ...req.body,
      code: req.body.code.toUpperCase(),
      createdBy: req.user._id,
      updateHistory: [
        {
          updatedBy: req.user._id,
          changes: req.body,
        },
      ],
    });

    logger.info(`Discount created: ${discount.code} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: discount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate discount code
// @route   POST /api/v1/discounts/validate
// @access  Private
exports.validateDiscount = async (req, res, next) => {
  try {
    const { code, orderValue } = req.body;

    const discount = await Discount.findOne({
      code: code.toUpperCase(),
      status: 1,
    });

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Mã giảm giá không tồn tại",
      });
    }

    if (!discount.isValid(orderValue)) {
      return res.status(400).json({
        success: false,
        message: "Mã giảm giá không hợp lệ hoặc đã hết hạn",
      });
    }

    const discountAmount = discount.calculateDiscount(orderValue);

    res.status(200).json({
      success: true,
      data: {
        code: discount.code,
        type: discount.type,
        value: discount.value,
        discountAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update discount status
// @route   PATCH /api/v1/discounts/:id/status
// @access  Private/Admin
exports.updateDiscountStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const statusNum = parseInt(status);

    const discount = await Discount.findById(req.params.id);
    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy mã giảm giá",
      });
    }

    // Sử dụng general validator
    const validation = validateGeneralStatusChange(discount, statusNum);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const updateDiscount = await Discount.findByIdAndUpdate(
      req.params.id,
      {
        status: statusNum,
        $push: {
          updateHistory: {
            updatedBy: req.user._id,
            changes: { status: statusNum },
          },
        },
      },
      { new: true }
    );

    logger.info(
      `Discount status updated: ${discount.code} to ${statusNum} by ${req.user.email}`
    );

    res.status(200).json({
      success: true,
      data: updateDiscount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete discount
// @route   DELETE /api/v1/discounts/:id
// @access  Private/Admin
exports.deleteDiscount = async (req, res, next) => {
  try {
    const discount = await Discount.findById(req.params.id);

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy mã giảm giá",
      });
    }

    if (discount.usedCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa mã giảm giá đã được sử dụng",
      });
    }

    await discount.deleteOne();

    logger.info(`Discount deleted: ${discount.code} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: "Xóa mã giảm giá thành công",
    });
  } catch (error) {
    next(error);
  }
};
