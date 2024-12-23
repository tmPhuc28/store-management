// src/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false,
    },
    role: {
      type: Number,
      enum: [0, 1], // 0: user, 1: admin
      default: 0,
    },
    status: {
      type: Number,
      enum: [0, 1], // 0: inactive, 1: active
      default: 1,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
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
    lastLogin: {
      timestamp: Date,
      ipAddress: String,
      userAgent: String,
    },
    passwordChangedAt: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
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

// Virtual
userSchema.virtual("roleText").get(function () {
  return this.role === 1 ? "admin" : "user";
});

userSchema.virtual("statusText").get(function () {
  return this.status === 1 ? "active" : "inactive";
});

userSchema.virtual("lastLoginAgo").get(function () {
  if (!this.lastLogin?.timestamp) {
    return `Not logged in yet`;
  }

  const seconds = Math.floor((new Date() - this.lastLogin.timestamp) / 1000);

  // Less than 1 minute
  if (seconds < 60) {
    return `${seconds} seconds ago`;
  }

  // Less than 1 hour
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }

  // Less than 1 day
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }

  // Less than 1 month
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }

  // Less than 1 year
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months !== 1 ? "s" : ""} ago`;
  }

  // More than 1 year
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT));
  this.password = await bcrypt.hash(this.password, salt);

  if (this.isModified("password") && !this.isNew) {
    this.passwordChangedAt = Date.now();
  }

  next();
});

// Sync status with employee
userSchema.pre("save", async function (next) {
  if (this.isModified("status") && this.employee) {
    await mongoose
      .model("Employee")
      .findByIdAndUpdate(this.employee, { status: this.status });
  }
  next();
});

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if password was changed after token was issued
userSchema.methods.hasPasswordChangedAfterToken = function (tokenTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return tokenTimestamp < changedTimestamp;
  }
  return false;
};

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
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

  this.refreshTokens.push({ token: refreshToken });
  return refreshToken;
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

// Update last login
userSchema.methods.updateLastLogin = async function (ipAddress, userAgent) {
  this.lastLogin = {
    timestamp: new Date(),
    ipAddress,
    userAgent,
  };
  await this.save();
};

// Indexes
//userSchema.index({ username: 1 });
//userSchema.index({ email: 1 });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ employee: 1 });

module.exports = mongoose.model("User", userSchema);
