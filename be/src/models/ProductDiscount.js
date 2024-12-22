// src/models/ProductDiscount.js
const mongoose = require("mongoose");

const productDiscountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Discount name is required"],
      trim: true,
      maxlength: [100, "Name cannot be more than 100 characters"],
    },
    code: {
      type: String,
      required: [true, "Discount code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [20, "Code cannot be more than 20 characters"],
    },
    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    type: {
      type: String,
      required: true,
      enum: ["percentage", "fixed"],
    },
    value: {
      type: Number,
      required: true,
      min: [0, "Discount value cannot be negative"],
      validate: {
        validator: function (value) {
          return !(this.type === "percentage" && value > 100);
        },
        message: "Percentage discount cannot exceed 100%",
      },
    },
    maxDiscount: {
      type: Number,
      default: null,
      min: [0, "Maximum discount amount cannot be negative"],
      validate: {
        validator: function (value) {
          return this.type !== "fixed" || !value;
        },
        message: "Maximum discount only applies to percentage discounts",
      },
    },
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    usageLimit: {
      type: Number,
      default: null,
      min: [1, "Usage limit must be at least 1"],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, "Used count cannot be negative"],
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals
productDiscountSchema.virtual("statusText").get(function () {
  return this.status === 1 ? "active" : "inactive";
});

productDiscountSchema.virtual("isActive").get(function () {
  if (this.status !== 1) return false;

  const now = new Date();
  if (now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  if (this.usageLimit && this.usedCount >= this.usageLimit) return false;

  return true;
});

productDiscountSchema.virtual("remainingUses").get(function () {
  if (!this.usageLimit) return null;
  return Math.max(0, this.usageLimit - this.usedCount);
});

// Methods
productDiscountSchema.methods.isValidForProduct = function (product) {
  if (!this.isActive) return false;
  if (
    this.applicableProducts.length > 0 &&
    !this.applicableProducts.includes(product._id)
  )
    return false;
  return true;
};

productDiscountSchema.methods.calculateDiscountAmount = function (
  productPrice
) {
  if (this.type === "percentage") {
    const discount = (productPrice * this.value) / 100;
    return this.maxDiscount ? Math.min(discount, this.maxDiscount) : discount;
  }
  return Math.min(this.value, productPrice);
};

// Indexes
//productDiscountSchema.index({ code: 1 }, { unique: true });
productDiscountSchema.index({ status: 1 });
productDiscountSchema.index({ startDate: 1 });
productDiscountSchema.index({ endDate: 1 });
productDiscountSchema.index({ createdAt: -1 });
productDiscountSchema.index({
  status: 1,
  startDate: 1,
  endDate: 1,
});

module.exports = mongoose.model("ProductDiscount", productDiscountSchema);
