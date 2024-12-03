const mongoose = require("mongoose");
const {
  INVOICE_STATES,
  PAYMENT_METHODS,
} = require("../constants/invoice.constants");

const paymentInfoSchema = new mongoose.Schema({
  // Common payment fields
  amount: Number,
  paidAmount: Number,
  paidAt: Date,
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  // Bank transfer specific
  bankTransfer: {
    qrCode: String,
    transactionId: String,
    bankReference: String,
    confirmedAt: Date,
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },

  // Generic fields
  notes: String,
  additionalData: mongoose.Schema.Types.Mixed,
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: Object.values(INVOICE_STATES),
      default: INVOICE_STATES.PENDING,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    items: [
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
        price: {
          type: Number,
          required: true,
        },
        subTotal: {
          type: Number,
          required: true,
        },
      },
    ],
    subTotal: {
      type: Number,
      required: true,
    },
    discount: {
      discountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Discount",
      },
      code: String,
      type: {
        type: String,
        enum: ["percentage", "fixed"],
      },
      value: Number,
      amount: Number,
    },
    total: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: Object.values(PAYMENT_METHODS),
    },
    paymentInfo: paymentInfoSchema,
    notes: String,
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

// Add method to check valid state transition
invoiceSchema.methods.canTransitionTo = function (newState) {
  const STATE_TRANSITIONS = {
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

  return STATE_TRANSITIONS[this.status]?.includes(newState) || false;
};

// Add method to check if payment is complete
invoiceSchema.methods.isPaymentComplete = function () {
  if (!this.paymentInfo?.paidAmount) return false;
  return this.paymentInfo.paidAmount >= this.total;
};

// Add indexes
invoiceSchema.index({ customer: 1, createdAt: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ "paymentInfo.paidAt": 1 });
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });

module.exports = mongoose.model("Invoice", invoiceSchema);
