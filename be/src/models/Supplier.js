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

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: null,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    phone: {
      type: String,
      default: null,
      trim: true,
      match: [/^[0-9+\-\s()]*$/, "Please enter a valid phone number"],
    },
    position: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { _id: false }
);

const bankInfoSchema = new mongoose.Schema(
  {
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{8,19}$/, "Account number must be 8-19 digits"],
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    branch: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { _id: false }
);

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
      maxlength: [100, "Name cannot be more than 100 characters"],
    },
    code: {
      type: String,
      required: [true, "Supplier code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [20, "Code cannot be more than 20 characters"],
    },
    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    phone: {
      type: String,
      default: null,
      trim: true,
      match: [/^[0-9+\-\s()]*$/, "Please enter a valid phone number"],
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    website: {
      type: String,
      default: null,
      trim: true,
    },
    taxCode: {
      type: String,
      default: null,
      trim: true,
      match: [/^[0-9]{10,13}$/, "Invalid tax code format"],
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
    contacts: [contactSchema],
    bankInfo: {
      type: bankInfoSchema,
      default: null,
    },
    paymentTerms: {
      type: String,
      default: null,
      trim: true,
      maxlength: [200, "Payment terms cannot exceed 200 characters"],
    },
    logo: {
      type: String,
      default: null,
    },
    status: {
      type: Number,
      enum: [0, 1],
      default: 1,
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
supplierSchema.virtual("statusText").get(function () {
  return this.status === 1 ? "active" : "inactive";
});

supplierSchema.virtual("fullAddress").get(function () {
  if (!this.address || typeof this.address !== "object") return null;
  const addressParts = [
    this.address.detail,
    this.address.ward,
    this.address.district,
    this.address.province,
  ];
  return addressParts.filter(Boolean).join(", ");
});

// Pre-save middleware
supplierSchema.pre("save", function (next) {
  // Convert empty strings to null
  Object.keys(this._doc).forEach((key) => {
    if (this[key] === "") {
      this[key] = null;
    }
  });

  // Handle nested address object
  if (this.address) {
    Object.keys(this.address._doc).forEach((key) => {
      if (this.address[key] === "") {
        this.address[key] = null;
      }
    });
  }

  // Handle nested bank info object
  if (this.bankInfo) {
    Object.keys(this.bankInfo._doc).forEach((key) => {
      if (this.bankInfo[key] === "") {
        this.bankInfo[key] = null;
      }
    });
  }

  next();
});

// Indexes
supplierSchema.index({ name: "text", code: "text" });
//supplierSchema.index({ code: 1 }, { unique: true });
supplierSchema.index({ status: 1 });
supplierSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Supplier", supplierSchema);
