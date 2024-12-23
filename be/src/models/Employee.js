// src/models/Employee.js
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

const employeeSchema = new mongoose.Schema(
  {
    // Required fields
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      match: [/^[0-9+\-\s()]*$/, "Please enter a valid phone number"],
    },

    // Optional fields with default values

    dateOfBirth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "male",
    },
    position: {
      type: String,
      default: null,
      trim: true,
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals
employeeSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

employeeSchema.virtual("age").get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

employeeSchema.virtual("statusText").get(function () {
  return this.status === 1 ? "active" : "inactive";
});

// Middleware to sync User status if exists
employeeSchema.pre("save", async function (next) {
  if (this.isModified("status") && this.userId) {
    await mongoose.model("User").findByIdAndUpdate(this.userId, {
      status: this.status,
    });
  }
  next();
});

// Generate username based on employee name
employeeSchema.methods.generateUsername = function () {
  const baseName = `${this.firstName.toLowerCase()}.${this.lastName.toLowerCase()}`;
  return baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9.]/g, ""); // Remove special characters
};

// Indexes
//employeeSchema.index({ phone: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ position: 1 });
employeeSchema.index({
  firstName: "text",
  lastName: "text",
  phone: "text",
});

module.exports = mongoose.model("Employee", employeeSchema);
