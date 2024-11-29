// src/models/Discount.js
const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: [0, "Giá trị giảm giá không thể âm"],
    },
    minOrderValue: {
      type: Number,
      default: 0,
    },
    maxDiscount: {
      type: Number, // Chỉ áp dụng cho loại percentage
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      default: null, // null means unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: Number,
      enum: [0, 1],
      default: 1,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updateHistory: [
      {
        action: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        changes: Object,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Check if discount is valid
discountSchema.methods.isValid = function (orderValue) {
  const now = new Date();
  return (
    this.status === 1 &&
    now >= this.startDate &&
    now <= this.endDate &&
    orderValue >= this.minOrderValue &&
    (this.usageLimit === null || this.usedCount < this.usageLimit)
  );
};

// Calculate discount amount
discountSchema.methods.calculateDiscount = function (orderValue) {
  if (this.type === "percentage") {
    const discount = (orderValue * this.value) / 100;
    return this.maxDiscount ? Math.min(discount, this.maxDiscount) : discount;
  }
  return this.value;
};

module.exports = mongoose.model("Discount", discountSchema);
