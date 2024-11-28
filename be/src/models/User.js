// src/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const addressSchema = new mongoose.Schema({
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
});

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters long"],
      lowercase: true,
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers and underscore",
      ],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false,
    },
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
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      match: [/^[0-9+\-\s()]*$/, "Please enter a valid phone number"],
    },
    address: addressSchema,
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    status: {
      type: Number,
      enum: [0, 1],
      default: 1,
      required: true,
    },
    refreshTokens: [
      {
        token: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
          expires: 7 * 24 * 60 * 60, // Auto-delete after 7 days
        },
      },
    ],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    activityLog: [
      {
        action: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        details: Object,
        ipAddress: String,
        userAgent: String,
      },
    ],
    lastLogin: {
      timestamp: Date,
      ipAddress: String,
      userAgent: String,
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

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for status text
userSchema.virtual("statusText").get(function () {
  return this.status === 1 ? "active" : "inactive";
});

// Virtual for age
userSchema.virtual("age").get(function () {
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

// Encrypt password using bcrypt
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT));
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function () {
  const refreshToken = jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE }
  );

  // Add to refresh tokens array
  this.refreshTokens.push({ token: refreshToken });

  return refreshToken;
};

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Add refresh token
userSchema.methods.addRefreshToken = async function (token) {
  this.refreshTokens.push({ token });
  await this.save();
};

// Remove refresh token
userSchema.methods.removeRefreshToken = async function (token) {
  this.refreshTokens = this.refreshTokens.filter((t) => t.token !== token);
  await this.save();
};

// Remove all refresh tokens
userSchema.methods.removeAllRefreshTokens = async function () {
  this.refreshTokens = [];
  await this.save();
};

// Log activity
userSchema.methods.logActivity = async function (
  action,
  details,
  reqInfo = {}
) {
  this.activityLog.push({
    action,
    details,
    ipAddress: reqInfo.ip,
    userAgent: reqInfo.userAgent,
  });
  await this.save();
};

// Update last login
userSchema.methods.updateLastLogin = async function (reqInfo = {}) {
  this.lastLogin = {
    timestamp: new Date(),
    ipAddress: reqInfo.ip,
    userAgent: reqInfo.userAgent,
  };
  await this.save();
};

// Indexes
userSchema.index({ username: 1, email: 1 });
userSchema.index({ status: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ "address.province": 1, "address.district": 1 });

module.exports = mongoose.model("User", userSchema);
