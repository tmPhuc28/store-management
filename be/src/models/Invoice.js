// src/models/Invoice.js
const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"],
  },
  price: {
    type: Number,
    required: true,
    min: [0, "Price cannot be negative"],
  },
  discount: {
    type: Number,
    default: 0,
  },
  finalPrice: {
    type: Number,
    required: true,
  },
  subTotal: {
    type: Number,
    required: true,
    min: [0, "Subtotal cannot be negative"],
  },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    items: [invoiceItemSchema],
    subTotal: {
      type: Number,
      required: true,
      min: [0, "Subtotal cannot be negative"],
    },
    appliedDiscount: {
      code: {
        type: String,
      },
      percentage: {
        type: Number,
        default: 0,
      },
      amount: {
        type: Number,
        default: 0,
      },
    },
    total: {
      type: Number,
      required: true,
      min: [0, "Total cannot be negative"],
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["cash", "card", "bank_transfer", "qr_code"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    notes: String,
    qrCode: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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

invoiceSchema.pre("save", function (next) {
  // Tính subTotal từ các items
  this.subTotal = this.items.reduce((sum, item) => sum + item.subTotal, 0);

  // Tính total sau khi áp dụng discount
  let discountAmount = this.appliedDiscount.amount;
  if (this.appliedDiscount.percentage > 0) {
    discountAmount = (this.subTotal * this.appliedDiscount.percentage) / 100;
  }

  this.total = this.subTotal - discountAmount;
  next();
});

// Generate invoice number
invoiceSchema.pre("save", async function (next) {
  if (this.isNew) {
    const count = await mongoose.model("Invoice").countDocuments();
    const currentDate = new Date();
    const year = currentDate.getFullYear().toString().slice(-2);
    const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    this.invoiceNumber = `INV${year}${month}${(count + 1)
      .toString()
      .padStart(6, "0")}`;
  }
  next();
});

// Calculate totals
invoiceSchema.pre("save", function (next) {
  // Calculate subtotal from items
  this.subTotal = this.items.reduce((sum, item) => sum + item.subTotal, 0);

  // Calculate final total with tax and discount
  const discountAmount = (this.subTotal * this.discount) / 100;
  this.total = this.subTotal - discountAmount + this.tax;

  next();
});

// Virtual for status text
invoiceSchema.virtual("statusText").get(function () {
  return this.status === 1 ? "active" : "inactive";
});

// Add indexes
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ customer: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model("Invoice", invoiceSchema);
