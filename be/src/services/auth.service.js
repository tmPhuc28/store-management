// src/services/auth.service.js
const BaseService = require("./base/base.service");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

class AuthService extends BaseService {
  constructor() {
    super(User, "Auth");
    this.useTransactions = true;
    this.excludeFields = [...this.excludeFields];
  }

  /**
   * Register new user
   */
  async register(data, clientInfo = {}) {
    let session = null;
    try {
      session = await this.startTransaction();
      // Check for existing user
      await Promise.all([
        this.validateUnique({ email: data.email }),
        this.validateUnique({ username: data.username }),
      ]);

      // Force role to be user (0) for registration
      const userData = {
        ...data,
        role: 0, // Ensure new users are always regular users
      };

      // Create user with history
      const user = await this.model.create(
        [
          {
            ...userData,
            updateHistory: [
              {
                action: "register",
                updatedBy: null, // System action
                changes: {
                  ...userData,
                  password: "[secured]",
                },
              },
            ],
          },
        ],
        { session }
      );

      await this.endTransaction(session, true);

      this.logger.success("User registered successfully", {
        userId: user[0]._id,
        email: user[0].email,
        ...clientInfo,
      });

      return user[0];
    } catch (error) {
      await this.endTransaction(session, false);
      this.logger.error("Registration failed", error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(credentials, clientInfo = {}) {
    try {
      const { login, password } = credentials;

      // Find user by email or username
      const user = await this.model
        .findOne({
          $or: [
            { email: login.toLowerCase() },
            { username: login.toLowerCase() },
          ],
          status: 1,
        })
        .select("+password");

      if (!user) {
        throw new Error("Invalid credentials");
      }

      // Check password
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        throw new Error("Invalid credentials");
      }

      // Generate tokens
      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      // Update last login
      await user.updateLastLogin(clientInfo.ipAddress, clientInfo.userAgent);

      // Save user with new refresh token
      await user.save();

      this.logger.success("User logged in successfully", {
        userId: user._id,
        ...clientInfo,
      });

      return {
        user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error("Login failed", error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken, clientInfo = {}) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Get user and check token exists
      const user = await this.model.findById(decoded.id);
      const tokenExists = user.refreshTokens.find(
        (t) => t.token === refreshToken
      );

      if (!user || !tokenExists) {
        throw new Error("Invalid refresh token");
      }

      // Remove old refresh token
      await user.removeRefreshToken(refreshToken);

      // Generate new tokens
      const accessToken = user.generateAuthToken();
      const newRefreshToken = user.generateRefreshToken();

      // Save user with new refresh token
      await user.save();

      this.logger.success("Tokens refreshed successfully", {
        userId: user._id,
        ...clientInfo,
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      this.logger.error("Token refresh failed", error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(user, refreshToken, clientInfo = {}) {
    try {
      if (refreshToken) {
        await user.removeRefreshToken(refreshToken);
      }

      this.logger.success("User logged out successfully", {
        userId: user._id,
        ...clientInfo,
      });

      return true;
    } catch (error) {
      this.logger.error("Logout failed", error);
      throw error;
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(user, clientInfo = {}) {
    try {
      await user.removeAllRefreshTokens();

      this.logger.success("User logged out from all devices", {
        userId: user._id,
        ...clientInfo,
      });

      return true;
    } catch (error) {
      this.logger.error("Logout all failed", error);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(user, currentPassword, newPassword, clientInfo = {}) {
    try {
      const userWithPassword = await this.model
        .findById(user._id)
        .select("+password");

      // Verify current password
      const isMatch = await userWithPassword.matchPassword(currentPassword);
      if (!isMatch) {
        throw new Error("Current password is incorrect");
      }

      // Update password
      userWithPassword.password = newPassword;
      await userWithPassword.save();

      // Logout from all devices
      await this.logoutAll(userWithPassword, clientInfo);

      this.logger.success("Password changed successfully", {
        userId: user._id,
        ...clientInfo,
      });

      return true;
    } catch (error) {
      this.logger.error("Password change failed", error);
      throw error;
    }
  }

  /**
   * Override base methods
   */
  async validateUnique(data) {
    if (data.email) {
      const existing = await this.model.findOne({ email: data.email });
      if (existing) throw new Error("Email already registered");
    }

    if (data.username) {
      const existing = await this.model.findOne({ username: data.username });
      if (existing) throw new Error("Username already taken");
    }
  }
}

module.exports = new AuthService();
