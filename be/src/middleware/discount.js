// src/middleware/discount.js
const Discount = require("../models/Discount");
const { logAction } = require("../utils/logger");

const discountLog = logAction("Discount");

exports.validateDiscountCode = async (req, res, next) => {
  try {
    const { discountCode } = req.body;
    if (!discountCode) {
      return next();
    }

    const discount = await Discount.findOne({
      code: discountCode.toUpperCase(),
      status: 1,
    });

    if (!discount) {
      return res.status(400).json({
        success: false,
        message: "Invalid discount code",
      });
    }

    // Calculate total value from items
    const totalValue = req.body.items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    // Validate discount
    const now = new Date();
    const isValid =
      now >= discount.startDate &&
      (!discount.endDate || now <= discount.endDate) &&
      totalValue >= discount.minOrderValue &&
      (discount.usageLimit === null ||
        discount.usedCount < discount.usageLimit);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Discount code is not applicable to this order",
      });
    }

    // Attach discount to request for later use
    req.validatedDiscount = discount;
    next();
  } catch (error) {
    discountLog.error("Discount validation failed", error);
    next(error);
  }
};

exports.checkDiscountAvailability = async (req, res, next) => {
  try {
    const { discountCode } = req.query;
    if (!discountCode) {
      return res.status(400).json({
        success: false,
        message: "Discount code is required",
      });
    }

    const discount = await Discount.findOne({
      code: discountCode.toUpperCase(),
      status: 1,
    });

    if (!discount) {
      return res.status(400).json({
        success: false,
        message: "Invalid discount code",
      });
    }

    const now = new Date();
    const isValid =
      now >= discount.startDate &&
      (!discount.endDate || now <= discount.endDate) &&
      (discount.usageLimit === null ||
        discount.usedCount < discount.usageLimit);

    res.status(200).json({
      success: true,
      data: {
        code: discount.code,
        type: discount.type,
        value: discount.value,
        minOrderValue: discount.minOrderValue,
        maxDiscount: discount.maxDiscount,
        isValid,
        message: isValid
          ? "Discount code is valid"
          : "Discount code is not applicable",
      },
    });
  } catch (error) {
    discountLog.error("Discount availability check failed", error);
    next(error);
  }
};
