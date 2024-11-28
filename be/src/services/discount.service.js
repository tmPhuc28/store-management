// src/services/discount.service.js
const Discount = require("../models/Discount");

class DiscountService {
  async validateAndCalculateDiscount(code, orderValue) {
    const discount = await Discount.findOne({
      code: code.toUpperCase(),
      status: 1,
    });

    if (!discount) {
      throw new Error("Mã giảm giá không tồn tại");
    }

    if (!discount.isValid(orderValue)) {
      throw new Error("Mã giảm giá không hợp lệ hoặc đã hết hạn");
    }

    const discountAmount = discount.calculateDiscount(orderValue);

    return {
      discountId: discount._id,
      code: discount.code,
      type: discount.type,
      value: discount.value,
      discountAmount,
    };
  }

  async incrementUsage(discountId) {
    await Discount.findByIdAndUpdate(discountId, {
      $inc: { usedCount: 1 },
    });
  }

  async checkProductDiscount(product) {
    if (!product.discount || !product.discount.isActive) {
      return {
        hasDiscount: false,
        finalPrice: product.price,
      };
    }

    const now = new Date();
    const isValid =
      (!product.discount.startDate || now >= product.discount.startDate) &&
      (!product.discount.endDate || now <= product.discount.endDate);

    if (!isValid) {
      return {
        hasDiscount: false,
        finalPrice: product.price,
      };
    }

    const discountAmount = (product.price * product.discount.percentage) / 100;
    const finalPrice = product.price - discountAmount;

    return {
      hasDiscount: true,
      percentage: product.discount.percentage,
      originalPrice: product.price,
      discountAmount,
      finalPrice,
    };
  }
}

module.exports = new DiscountService();
