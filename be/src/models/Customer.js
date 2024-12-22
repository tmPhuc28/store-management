// src/models/Customer.js
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    detail: {
      type: String,
      default: null,
      trim: true,
    },
    ward: {
      type: String,
      default: null,
      trim: true,
    },
    district: {
      type: String,
      default: null,
      trim: true,
    },
    province: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add customer name"],
      trim: true,
      maxlength: [100, "Name cannot be more than 100 characters"],
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple null values
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    phone: {
      type: String,
      required: [true, "Please add phone number"],
      unique: true,
      trim: true,
      match: [/^[0-9+\-\s()]*$/, "Please enter a valid phone number"],
    },
    address: {
      type: addressSchema,
      default: () => ({
        detail: null,
        ward: null,
        district: null,
        province: null,
      }),
    },
    status: {
      type: Number,
      enum: [0, 1], // 0: inactive, 1: active
      default: 1,
    },
    purchaseHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invoice",
      },
    ],
    totalPurchases: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    averageOrderValue: {
      type: Number,
      default: 0,
    },
    lastPurchaseDate: Date,
    notes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updateHistory: [
      {
        action: {
          type: String,
        },
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
customerSchema.virtual("statusText").get(function () {
  return this.status === 1 ? "active" : "inactive";
});

customerSchema.virtual("fullAddress").get(function () {
  if (!this.address || typeof this.address !== "object") return null;

  // Tạo mảng các phần tử địa chỉ
  const addressParts = [
    this.address.detail,
    this.address.ward,
    this.address.district,
    this.address.province,
  ];

  // Lọc bỏ các giá trị null/undefined/empty và nối lại
  return addressParts.filter(Boolean).join(", ");
});

// Pre-save middleware
customerSchema.pre("save", function (next) {
  // Handle nested address object
  if (this.address) {
    Object.keys(this.address).forEach((key) => {
      if (this.address[key] === "") {
        this.address[key] = null;
      }
    });

    // If all address fields are null, set entire address to null
    if (Object.values(this.address).every((v) => v === null)) {
      this.address = null;
    }
  }

  next();
});

// Instance methods
customerSchema.methods.updatePurchaseStats = async function (session = null) {
  const invoices = await mongoose
    .model("Invoice")
    .find({
      customer: this._id,
      status: "completed",
    })
    .select("total createdAt")
    .session(session);

  this.totalPurchases = invoices.length;
  this.totalSpent = invoices.reduce((sum, inv) => sum + inv.total, 0);
  this.averageOrderValue =
    this.totalPurchases > 0 ? this.totalSpent / this.totalPurchases : 0;
  this.lastPurchaseDate =
    invoices.length > 0 ? invoices[invoices.length - 1].createdAt : null;

  if (session) {
    await this.save({ session });
  } else {
    await this.save();
  }
};

// Indexes
customerSchema.index({ status: 1 });
//customerSchema.index({ phone: 1 });
//customerSchema.index({ email: 1 }, { sparse: true });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ lastPurchaseDate: -1 });
customerSchema.index({ totalPurchases: -1 });
customerSchema.index({ totalSpent: -1 });
customerSchema.index({
  name: "text",
  email: "text",
  phone: "text",
});

module.exports = mongoose.model("Customer", customerSchema);
