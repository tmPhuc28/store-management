// src/middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authService = require("../services/auth.service");
const { logAction } = require("../utils/logger");

const authLog = logAction("Auth");

exports.protect = async (req, res, next) => {
  try {
    // Get tokens from different sources
    let accessToken = req.cookies.accessToken;
    let refreshToken = req.cookies.refreshToken;

    // Check Authorization header if no cookies
    if (!accessToken && req.headers.authorization?.startsWith("Bearer")) {
      accessToken = req.headers.authorization.split(" ")[1];
      refreshToken = req.body.refreshToken;
    }

    // If no access token at all
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
    }

    try {
      // Verify access token
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      req.user = await authService.findUserAndCheckStatus(decoded.id);

      // Log access
      await req.user.logActivity(
        "api_access",
        {
          route: req.originalUrl,
          method: req.method,
        },
        {
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        }
      );

      next();
    } catch (error) {
      // If access token expired but refresh token exists
      if (error.name === "TokenExpiredError" && refreshToken) {
        try {
          // Try to refresh tokens
          const reqInfo = {
            ip: req.ip,
            userAgent: req.headers["user-agent"],
          };

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
            await authService.refreshToken(refreshToken, reqInfo);

          // Set new cookies
          res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            expires: new Date(
              Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
            ),
          });

          if (newRefreshToken) {
            res.cookie("refreshToken", newRefreshToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              expires: new Date(
                Date.now() +
                  process.env.REFRESH_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
              ),
            });
          }

          // Verify new access token
          const decoded = jwt.verify(newAccessToken, process.env.JWT_SECRET);
          req.user = await authService.findUserAndCheckStatus(decoded.id);

          next();
        } catch (refreshError) {
          return res.status(401).json({
            success: false,
            message: "Session expired. Please login again",
          });
        }
      } else {
        return res.status(401).json({
          success: false,
          message: "Not authorized to access this route",
        });
      }
    }
  } catch (error) {
    authLog.error("Authentication middleware error", error);
    next(error);
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};
