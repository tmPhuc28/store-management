// src/models/Invoice.js
const mongoose = require("mongoose");
const {
  INVOICE_STATES,
  PAYMENT_METHODS,
} = require("../constants/invoice.constants");

// Schema cho item trong invoice
const invoiceItemSchema = new mongoose.Schema(
  {
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
    importPrice: {
      type: Number,
      required: true,
      min: [0, "Import price cannot be negative"],
    },
    price: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"],
    },
    discount: {
      code: String,
      type: {
        type: String,
        enum: ["percentage", "fixed"],
      },
      value: Number,
      amount: Number,
    },
    finalPrice: {
      type: Number,
      required: true,
      min: [0, "Final price cannot be negative"],
    },
    subTotal: {
      type: Number,
      required: true,
    },
  },
  { _id: true }
);

// Schema cho discount của invoice
const invoiceDiscountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["percentage", "fixed"],
    },
    value: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

// Schema cho thông tin thanh toán
const paymentInfoSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      required: true,
      enum: Object.values(PAYMENT_METHODS),
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidAt: Date,
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    bankTransfer: {
      transactionId: String,
      bankReference: String,
      qrCode: String,
    },
    notes: String,
  },
  { _id: false }
);

// Main invoice schema
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
    status: {
      type: String,
      enum: Object.values(INVOICE_STATES),
      default: INVOICE_STATES.PENDING,
    },
    items: [invoiceItemSchema],
    subTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: invoiceDiscountSchema,
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    payment: paymentInfoSchema,
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    confirmedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    completedAt: Date,
    canceledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    canceledAt: Date,
    cancelReason: String,
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    refundedAt: Date,
    refundReason: String,
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
        notes: String,
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
invoiceSchema.virtual("profit").get(function () {
  return this.items.reduce((total, item) => {
    return total + item.quantity * (item.finalPrice - item.importPrice);
  }, 0);
});

invoiceSchema.virtual("isPaid").get(function () {
  if (!this.payment) return false;
  return this.payment.paidAmount >= this.total;
});

// Methods
invoiceSchema.methods.canTransitionTo = function (newStatus) {
  const currentState = this.status;
  const validTransitions = {
    [INVOICE_STATES.PENDING]: [
      INVOICE_STATES.CONFIRMED,
      INVOICE_STATES.CANCELED,
    ],
    [INVOICE_STATES.CONFIRMED]: [INVOICE_STATES.PAID, INVOICE_STATES.CANCELED],
    [INVOICE_STATES.PAID]: [INVOICE_STATES.COMPLETED, INVOICE_STATES.REFUNDED],
    [INVOICE_STATES.COMPLETED]: [],
    [INVOICE_STATES.CANCELED]: [],
    [INVOICE_STATES.REFUNDED]: [],
  };

  return validTransitions[currentState]?.includes(newStatus) || false;
};

// Indexes
//invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ customer: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ "payment.paidAt": 1 });
invoiceSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Invoice", invoiceSchema);
