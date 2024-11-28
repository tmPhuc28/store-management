// src/controllers/auth.controller.js
const { validationResult } = require("express-validator");
const authService = require("../services/auth.service");

// Helper function to send token response
const sendTokenResponse = (res, statusCode, tokens, user) => {
  const { accessToken, refreshToken, cookieOptions } = tokens;

  // Set cookies
  res.cookie("accessToken", accessToken, cookieOptions);
  if (refreshToken) {
    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      expires: new Date(
        Date.now() + process.env.REFRESH_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
    });
  }

  // Send response
  res.status(statusCode).json({
    success: true,
    data: {
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.statusText,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    },
  });
};

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const reqInfo = {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    const user = await authService.register(req.body, reqInfo);
    const tokens = authService.createTokenResponse(
      user,
      user.generateRefreshToken()
    );

    sendTokenResponse(res, 201, tokens, user);
  } catch (error) {
    if (error.message.includes("already registered")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const reqInfo = {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    const { user, accessToken, refreshToken } = await authService.login(
      req.body,
      reqInfo
    );

    sendTokenResponse(res, 200, { accessToken, refreshToken }, user);
  } catch (error) {
    if (
      error.message === "Invalid credentials" ||
      error.message.includes("inactive")
    ) {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Please provide refresh token",
      });
    }

    const reqInfo = {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    const tokens = await authService.refreshToken(refreshToken, reqInfo);

    res.status(200).json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    if (error.message === "Invalid refresh token") {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const reqInfo = {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    await authService.logout(req.user, refreshToken, reqInfo);

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.logoutAll = async (req, res, next) => {
  try {
    const reqInfo = {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    await authService.logoutAll(req.user, reqInfo);

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: "Logged out from all devices successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await authService.findUserAndCheckStatus(req.user._id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const reqInfo = {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    const { accessToken, refreshToken } = await authService.changePassword(
      req.user,
      req.body.currentPassword,
      req.body.newPassword,
      reqInfo
    );

    res.status(200).json({
      success: true,
      data: {
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    if (error.message === "Current password is incorrect") {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};
