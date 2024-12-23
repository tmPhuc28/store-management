const mongoose = require("mongoose");

const variantOptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    values: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
  },
  { _id: false }
);

const discountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["percentage", "fixed"],
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [100, "Name cannot be more than 100 characters"],
    },
    code: {
      type: String,
      required: [true, "Product code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [20, "Code cannot be more than 20 characters"],
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [50, "SKU cannot be more than 50 characters"],
    },
    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: [2000, "Description cannot be more than 2000 characters"],
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
    manufacturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manufacturer",
      default: null,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: [0, "Price cannot be negative"],
    },
    discount: {
      type: discountSchema,
      default: null,
    },
    importPrice: {
      type: Number,
      required: [true, "Import price is required"],
      min: [0, "Import price cannot be negative"],
    },
    sellingPrice: {
      type: Number,
      required: [true, "Selling price is required"],
      min: [0, "Selling price cannot be negative"],
      validate: {
        validator: function (value) {
          return value >= this.importPrice;
        },
        message: "Selling price must be greater than or equal to import price",
      },
    },
    currentPrice: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"],
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Quantity cannot be negative"],
    },
    minQuantity: {
      type: Number,
      default: 0,
      min: [0, "Minimum quantity cannot be negative"],
    },
    maxQuantity: {
      type: Number,
      default: null,
      validate: {
        validator: function (value) {
          return value === null || value >= this.minQuantity;
        },
        message: "Maximum quantity must be greater than minimum quantity",
      },
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      default: "Cái",
    },
    variantOptions: [variantOptionSchema],
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        isThumbnail: {
          type: Boolean,
          default: false,
        },
        order: {
          type: Number,
          default: 0,
        },
      },
    ],
    barcode: {
      type: String,
      default: null,
    },
    qrCode: {
      type: String,
      default: null,
    },
    specifications: {
      type: Map,
      of: String,
      default: new Map(),
    },
    warranty: {
      duration: {
        type: Number,
        default: 0,
      },
      unit: {
        type: String,
        enum: ["days", "months", "years"],
        default: "months",
      },
      description: {
        type: String,
        default: null,
      },
    },
    status: {
      type: Number,
      enum: [0, 1], // 0: inactive, 1: active
      default: 1,
    },
    isOutOfStock: {
      type: Boolean,
      default: false,
    },
    isDiscontinued: {
      type: Boolean,
      default: false,
    },
    discontinuedAt: {
      type: Date,
      default: null,
    },
    discontinuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
productSchema.virtual("statusText").get(function () {
  return this.status === 1 ? "active" : "inactive";
});

productSchema.virtual("thumbnail").get(function () {
  const thumbnail = this.images?.find((img) => img.isThumbnail);
  return thumbnail?.url || this.images?.[0]?.url || null;
});

productSchema.virtual("discountPercentage").get(function () {
  if (!this.discount?.discountId) return 0;
  if (this.discount.type !== "percentage") return 0;

  const now = new Date();
  if (now < this.discount.startDate) return 0;
  if (this.discount.endDate && now > this.discount.endDate) return 0;

  return this.discount.value;
});

productSchema.virtual("locations", {
  ref: "ProductLocation",
  localField: "_id",
  foreignField: "product",
});

// Middleware để tự động cập nhật currentPrice khi có thay đổi
productSchema.pre("save", function (next) {
  if (this.isModified("sellingPrice") || this.isModified("discount")) {
    this.currentPrice = this.calculateCurrentPrice();
  }
  next();
});

// Method để tính giá hiện tại dựa trên giảm giá
productSchema.methods.calculateCurrentPrice = function () {
  if (!this.discount) return this.sellingPrice;

  const now = new Date();
  if (now < this.discount.startDate) return this.sellingPrice;
  if (this.discount.endDate && now > this.discount.endDate)
    return this.sellingPrice;

  if (this.discount.type === "percentage") {
    const discountAmount = (this.sellingPrice * this.discount.value) / 100;
    return this.sellingPrice - discountAmount;
  }
  return this.sellingPrice - this.discount.value;
};

// Method để áp dụng mã giảm giá
productSchema.methods.applyDiscountCode = async function (code) {
  const ProductDiscount = mongoose.model("ProductDiscount");
  const discount = await ProductDiscount.findOne({
    code: code.toUpperCase(),
    status: 1,
    startDate: { $lte: new Date() },
    $or: [{ endDate: null }, { endDate: { $gt: new Date() } }],
  });

  if (!discount) throw new Error("Invalid or expired discount code");

  if (
    discount.applicableProducts.length > 0 &&
    !discount.applicableProducts.includes(this._id)
  ) {
    throw new Error("Discount not applicable for this product");
  }

  this.discount = {
    code: discount.code,
    type: discount.type,
    value: discount.value,
    startDate: discount.startDate,
    endDate: discount.endDate,
    amount: this.calculateDiscountAmount(discount),
  };

  this.currentPrice = this.calculateCurrentPrice();
  await this.save();
};

// Method để xóa discount
productSchema.methods.removeDiscount = async function (userId) {
  const oldPrice = this.currentPrice;

  this.discount = null;
  this.currentPrice = this.basePrice;

  // Ghi lại trong history
  this.updateHistory.push({
    action: "remove_discount",
    updatedBy: userId,
    timestamp: new Date(),
    changes: {
      oldPrice,
      newPrice: this.currentPrice,
    },
  });

  await this.save();
};

// Method để tính toán số tiền giảm giá
productSchema.methods.calculateDiscountAmount = function (discount) {
  if (discount.type === "percentage") {
    const amount = (this.sellingPrice * discount.value) / 100;
    return discount.maxDiscount
      ? Math.min(amount, discount.maxDiscount)
      : amount;
  }
  return Math.min(discount.value, this.sellingPrice);
};

// Indexes
productSchema.index({
  name: "text",
  code: "text",
  sku: "text",
  description: "text",
});
//productSchema.index({ code: 1 }, { unique: true });
//productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ category: 1 });
productSchema.index({ manufacturer: 1 });
productSchema.index({ supplier: 1 });
productSchema.index({ status: 1 });
productSchema.index({ isOutOfStock: 1 });
productSchema.index({ isDiscontinued: 1 });
productSchema.index({ categoryPath: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);
