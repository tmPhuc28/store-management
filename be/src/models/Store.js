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

// Virtual for formatted address
storeSchema.virtual("fullAddress").get(function () {
  const { detail, ward, district, province } = this.address;
  return [detail, ward, district, province].filter(Boolean).join(", ");
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

module.exports = mongoose.model("Store", storeSchema);
