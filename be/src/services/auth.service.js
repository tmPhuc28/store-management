// src/services/auth.service.js
const mongoose = require("mongoose");
const User = require("../models/User");
const { logAction } = require("../utils/logger");
const { createHistoryRecord } = require("../utils/historyHandler");
const jwt = require("jsonwebtoken");

const authLog = logAction("Auth");

class AuthService {
  async findUserAndCheckStatus(identifier) {
    try {
      // Kiểm tra xem identifier là id hay thông tin đăng nhập
      let query = {};

      if (mongoose.Types.ObjectId.isValid(identifier)) {
        query = { _id: identifier };
      } else {
        // Nếu là thông tin đăng nhập, tìm theo email hoặc username
        query = {
          $or: [
            { email: identifier.toLowerCase() },
            { username: identifier.toLowerCase() },
          ],
        };
      }

      // Quan trọng: phải select password vì mặc định password không được select
      const user = await User.findOne(query).select("+password");

      if (!user) {
        authLog.error("User not found", null, { identifier });
        throw new Error("Invalid credentials");
      }

      if (user.status !== 1) {
        authLog.error("Inactive user attempted login", null, {
          userId: user._id,
        });
        throw new Error(
          "Your account is inactive. Please contact administrator"
        );
      }

      // Log successful lookup
      authLog.success("User found and verified", { userId: user._id });

      return user;
    } catch (error) {
      // Log error but throw generic message for security
      authLog.error("User lookup failed", error, { identifier });
      throw new Error("Invalid credentials");
    }
  }

  async register(userData, reqInfo = {}) {
    try {
      // Kiểm tra email và username đã tồn tại chưa
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email },
          { username: userData.username },
          { phone: userData.phone },
        ],
      });

      if (existingUser) {
        let field = "email";
        if (existingUser.username === userData.username) field = "username";
        if (existingUser.phone === userData.phone) field = "phone";
        throw new Error(`${field} already registered`);
      }

      // Tạo user mới với lịch sử cập nhật
      const user = await User.create({
        ...userData,
        updateHistory: [
          {
            timestamp: new Date(),
            changes: {
              action: "register",
              ...userData,
              password: "[secured]", // Không lưu mật khẩu vào lịch sử
            },
          },
        ],
      });

      // Log hoạt động
      await user.logActivity(
        "register",
        {
          email: userData.email,
          username: userData.username,
        },
        reqInfo
      );

      authLog.success("New user registered", {
        userId: user._id,
        email: user.email,
      });

      return user;
    } catch (error) {
      authLog.error("Registration failed", error, { userData });
      throw error;
    }
  }

  async login(credentials, reqInfo = {}) {
    try {
      const { login, password } = credentials;

      // Tìm user và kiểm tra trạng thái
      const user = await this.findUserAndCheckStatus(login);

      // Kiểm tra mật khẩu
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        authLog.error("Password mismatch", null, { userId: user._id });
        throw new Error("Invalid credentials");
      }

      // Tạo tokens
      const accessToken = user.getSignedJwtToken();
      const refreshToken = user.generateRefreshToken();
      await user.save(); // Lưu refresh token

      // Cập nhật thông tin đăng nhập
      await user.updateLastLogin(reqInfo);
      await user.logActivity(
        "login",
        {
          loginMethod: login.includes("@") ? "email" : "username",
        },
        reqInfo
      );

      authLog.success("User logged in successfully", {
        userId: user._id,
        email: user.email,
      });

      return {
        user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      // Log chi tiết lỗi nhưng trả về thông báo chung
      authLog.error("Login failed", error, { login: credentials.login });
      throw new Error("Invalid credentials");
    }
  }

  async refreshToken(oldRefreshToken, reqInfo = {}) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(
        oldRefreshToken,
        process.env.JWT_REFRESH_SECRET
      );

      // Get user and check if refresh token exists
      const user = await User.findById(decoded.id);
      const tokenExists = user.refreshTokens.find(
        (t) => t.token === oldRefreshToken
      );

      if (!user || !tokenExists) {
        throw new Error("Invalid refresh token");
      }

      // Remove old refresh token
      await user.removeRefreshToken(oldRefreshToken);

      // Generate new tokens
      const accessToken = user.getSignedJwtToken();
      const refreshToken = user.generateRefreshToken();
      await user.save();

      // Log activity
      await user.logActivity("token_refresh", {}, reqInfo);

      authLog.success("Tokens refreshed", {
        userId: user._id,
      });

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      authLog.error("Token refresh failed", error);
      throw error;
    }
  }

  async logout(user, refreshToken, reqInfo = {}) {
    try {
      // Remove refresh token if provided
      if (refreshToken) {
        await user.removeRefreshToken(refreshToken);
      }

      await user.logActivity("logout", {}, reqInfo);

      authLog.success("User logged out", {
        userId: user._id,
      });

      return true;
    } catch (error) {
      authLog.error("Logout failed", error, {
        userId: user._id,
      });
      throw error;
    }
  }

  async logoutAll(user, reqInfo = {}) {
    try {
      // Remove all refresh tokens
      await user.removeAllRefreshTokens();
      await user.logActivity("logout_all", {}, reqInfo);

      authLog.success("User logged out from all devices", {
        userId: user._id,
      });

      return true;
    } catch (error) {
      authLog.error("Logout all failed", error, {
        userId: user._id,
      });
      throw error;
    }
  }

  async changePassword(user, currentPassword, newPassword, reqInfo = {}) {
    try {
      user = await User.findById(user._id).select("+password");

      // Verify current password
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        throw new Error("Current password is incorrect");
      }

      // Update password
      user.password = newPassword;
      user.updateHistory.push(
        createHistoryRecord(user, { password: "[updated]" }, "password_change")
      );
      await user.save();

      // Log out from all devices for security
      await this.logoutAll(user, reqInfo);

      // Log activity
      await user.logActivity("password_change", {}, reqInfo);

      authLog.success("Password changed", {
        userId: user._id,
      });

      // Generate new tokens
      const accessToken = user.getSignedJwtToken();
      const refreshToken = user.generateRefreshToken();
      await user.save();

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      authLog.error("Password change failed", error, {
        userId: user._id,
      });
      throw error;
    }
  }

  // Các helper methods
  createTokenResponse(user, refreshToken = null) {
    const accessToken = user.getSignedJwtToken();

    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
    };

    if (process.env.NODE_ENV === "production") {
      cookieOptions.secure = true;
    }

    return {
      accessToken,
      refreshToken: refreshToken || null,
      cookieOptions,
    };
  }
}

module.exports = new AuthService();
