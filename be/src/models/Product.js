// src/models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a product name"],
      trim: true,
      maxlength: [100, "Name cannot be more than 100 characters"],
    },
    sku: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
    },
    price: {
      type: Number,
      required: [true, "Please add a price"],
      min: [0, "Price must be greater than 0"],
    },
    discount: {
      percentage: {
        type: Number,
        default: 0,
        min: [0, "Discount cannot be negative"],
        max: [100, "Discount cannot exceed 100%"],
      },
      startDate: {
        type: Date,
      },
      endDate: {
        type: Date,
      },
      isActive: {
        type: Boolean,
        default: false,
      },
    },

    finalPrice: {
      type: Number,
      required: true,
      default: function () {
        if (this.discount && this.discount.isActive) {
          const now = new Date();
          if (
            (!this.discount.startDate || now >= this.discount.startDate) &&
            (!this.discount.endDate || now <= this.discount.endDate)
          ) {
            return this.price * (1 - this.discount.percentage / 100);
          }
        }
        return this.price;
      },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    categoryPath: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    quantity: {
      type: Number,
      required: [true, "Please add a quantity"],
      min: [0, "Quantity cannot be negative"],
    },
    variants: [
      {
        name: String,
        options: [String],
      },
    ],
    manufacturer: {
      type: String,
      required: false,
    },
    supplier: {
      type: String,
      required: false,
    },
    barcode: String,
    qrCode: String,
    status: {
      type: Number,
      enum: [0, 1], // 1: active, 0: inactive
      default: 1,
      required: true,
    },
    images: [String],
    updateHistory: [
      {
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

// Tự động cập nhật categoryPath khi category thay đổi
productSchema.pre("save", async function (next) {
  if (this.isModified("category")) {
    try {
      const Category = this.model("Category");
      const categoryPath = [];
      let currentCat = await Category.findById(this.category);

      // Xây dựng đường dẫn từ category hiện tại lên đến root
      while (currentCat) {
        categoryPath.unshift(currentCat._id);
        if (!currentCat.parentCategory) break;
        currentCat = await Category.findById(currentCat.parentCategory);
      }

      this.categoryPath = categoryPath;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Method để lấy thông tin đầy đủ về category path
productSchema.methods.getFullCategoryInfo = async function () {
  await this.populate("categoryPath", "name");
  return this.categoryPath.map((cat) => cat.name).join(" > ");
};

// Thêm virtual field để kiểm tra trạng thái giảm giá
productSchema.virtual("isDiscounted").get(function () {
  if (this.discount && this.discount.isActive) {
    const now = new Date();
    return (
      (!this.discount.startDate || now >= this.discount.startDate) &&
      (!this.discount.endDate || now <= this.discount.endDate)
    );
  }
  return false;
});

// Add virtual getter for status text
productSchema.virtual("statusText").get(function () {
  return this.status === 1 ? "active" : "inactive";
});

// Add indexes
productSchema.index({ name: "text", description: "text", sku: "text" });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ sku: 1 }, { unique: true });

module.exports = mongoose.model("Product", productSchema);
