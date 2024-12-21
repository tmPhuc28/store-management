// src/models/Store.js
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    detail: {
      type: String,
      required: [true, "Address detail is required"],
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

const bankInfoSchema = new mongoose.Schema(
  {
    bankId: {
      type: String,
      required: [true, "Bank ID is required"],
      trim: true,
    },
    bin: {
      type: String,
      required: [true, "Bank BIN is required"],
      trim: true,
    },
    shortName: {
      type: String,
      required: [true, "Bank short name is required"],
      trim: true,
    },
    accountNumber: {
      type: String,
      required: [true, "Account number is required"],
      trim: true,
      maxlength: [19, "Account number cannot exceed 19 characters"],
      match: [/^\d{8,19}$/, "Account number must be 8-19 digits"],
    },
    accountName: {
      type: String,
      required: [true, "Account name is required"],
      trim: true,
      uppercase: true,
    },
  },
  { _id: false }
);

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Store name is required"],
      trim: true,
      maxlength: [100, "Store name cannot exceed 100 characters"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^[0-9+\-\s()]*$/, "Please enter a valid phone number"],
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    address: {
      type: addressSchema,
      required: true,
      default: () => ({
        detail: "",
        ward: null,
        district: null,
        province: null,
      }),
    },
    taxCode: {
      type: String,
      default: null,
      trim: true,
      sparse: true,
      match: [/^[0-9]{10,13}$/, "Invalid tax code format"],
    },
    bankInfo: {
      type: bankInfoSchema,
      default: null,
    },
    updateHistory: [
      {
        action: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        changes: {
          type: Object,
          default: {},
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Virtual for formatted address
storeSchema.virtual("fullAddress").get(function () {
  const parts = [
    this.address.detail,
    this.address.ward,
    this.address.district,
    this.address.province,
  ];
  return parts.filter(Boolean).join(", ");
});

// Ensure only one store document exists
storeSchema.pre("save", async function (next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
    if (count > 0) {
      throw new Error("Only one store document is allowed");
    }
  }
  next();
});

// Pre-save middleware to convert empty strings to null
storeSchema.pre("save", function (next) {
  // Convert empty strings to null for root level fields
  Object.keys(this._doc).forEach((key) => {
    if (this[key] === "") {
      this[key] = null;
    }
  });

  // Handle nested address object
  if (this.address) {
    Object.keys(this.address._doc).forEach((key) => {
      if (key !== "detail" && this.address[key] === "") {
        this.address[key] = null;
      }
    });
  }

  next();
});

module.exports = mongoose.model("Store", storeSchema);
