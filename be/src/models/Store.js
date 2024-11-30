const mongoose = require("mongoose");

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
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    address: {
      detail: {
        type: String,
        required: [true, "Address detail is required"],
      },
      ward: String,
      district: String,
      province: String,
    },
    taxCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Updated bank information to match VietQR
    bankInfo: {
      bankId: {
        type: String,
        required: [true, "Bank ID is required"],
      },
      bin: {
        type: String,
        required: [true, "Bank BIN is required"],
      },
      shortName: {
        type: String,
        required: [true, "Bank short name is required"],
      },
      accountNumber: {
        type: String,
        required: [true, "Bank account number is required"],
        maxlength: [19, "Account number cannot exceed 19 characters"],
      },
      accountName: {
        type: String,
        required: [true, "Account name is required"],
      },
      template: {
        type: String,
        enum: ["compact", "compact2", "qr_only", "print"],
        default: "compact2",
      },
    },
    paymentQR: String, // Will be generated using VietQR format
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
  }
);

// Virtual for formatted address
storeSchema.virtual("fullAddress").get(function () {
  const { detail, ward, district, province } = this.address;
  return [detail, ward, district, province].filter(Boolean).join(", ");
});

// Generate VietQR URL
storeSchema.methods.generateVietQRUrl = function (
  amount = "",
  description = ""
) {
  try {
    const { bankId, accountNumber, template = "compact2" } = this.bankInfo;
    const accountName = encodeURIComponent(this.bankInfo.accountName);
    const desc = description ? encodeURIComponent(description) : "";

    const baseUrl = "https://img.vietqr.io/image";

    let url = `${baseUrl}/${bankId}-${accountNumber}-${template}.png`;

    const params = [];
    if (amount) params.push(`amount=${amount}`);
    if (desc) params.push(`addInfo=${desc}`);
    if (accountName) params.push(`accountName=${accountName}`);

    if (params.length > 0) {
      url += `?${params.join("&")}`;
    }

    return url;
  } catch (error) {
    throw new Error(`Failed to generate VietQR URL: ${error.message}`);
  }
};

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

module.exports = mongoose.model("Store", storeSchema);
