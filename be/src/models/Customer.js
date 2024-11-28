// src/models/Customer.js
const mongoose = require("mongoose");

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
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    phone: {
      type: Number,
      required: [true, "Please add phone number"],
      unique: true,
      trim: true,
      maxlength: [10, "Name cannot be more than 10 characters"],
    },
    address: {
      detail: {
        type: String,
        trim: true,
      },
      ward: {
        type: String,
        trim: true,
      },
      district: {
        type: String,
        trim: true,
      },
      province: {
        type: String,
        trim: true,
      },
    },
    status: {
      type: Number,
      enum: [0, 1],
      default: 1,
      required: true,
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
    lastPurchaseDate: Date,
    notes: String,
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

// Add virtual getter for status text
customerSchema.virtual("statusText").get(function () {
  return this.status === 1 ? "active" : "inactive";
});

// Add indexes
customerSchema.index({ name: "text", email: "text", phone: "text" });
customerSchema.index({ status: 1 });
customerSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Customer", customerSchema);
