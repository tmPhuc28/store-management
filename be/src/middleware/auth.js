// src/middleware/auth.js
const jwt = require("jsonwebtoken");
const { logAction } = require("../utils/logger");
const User = require("../models/User");

const authLog = logAction("Auth Middleware");

/**
 * Get token from request
 */
const getTokenFromRequest = (req) => {
  // First check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  // Then check cookies
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
};

/**
 * Get refresh token from request
 */
const getRefreshTokenFromRequest = (req) => {
  // Check body first
  if (req.body && req.body.refreshToken) {
    return req.body.refreshToken;
  }

  // Then check cookies
  if (req.cookies && req.cookies.refreshToken) {
    return req.cookies.refreshToken;
  }

  return null;
};

/**
 * Set new cookies after token refresh
 */
const setNewCookies = (res, { accessToken, refreshToken }) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.COOKIE_SAME_SITE || "strict",
  };

  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: Number(process.env.JWT_COOKIE_EXPIRE) * 60 * 1000,
  });

  if (refreshToken) {
    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: Number(process.env.JWT_REFRESH_COOKIE_EXPIRE) * 60 * 1000,
    });
  }
};

/**
 * Authentication & Authorization Middleware
 */
exports.protect = async (req, res, next) => {
  try {
    // Get token
    const token = getTokenFromRequest(req);

    if (!token) {
      throw new Error("Not authorized to access this route");
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user
      const user = await User.findById(decoded.id);

      // Check if user exists and is active
      if (!user || user.status !== 1) {
        throw new Error("User not found or inactive");
      }

      // Check if password was changed after token was issued
      if (
        user.hasPasswordChangedAfterToken &&
        user.hasPasswordChangedAfterToken(decoded.iat)
      ) {
        throw new Error("User recently changed password. Please login again");
      }

      // Add user to request
      req.user = user;

      authLog.success("Authentication successful", {
        userId: user._id,
        route: req.originalUrl,
      });

      next();
    } catch (error) {
      // If token expired, try to refresh
      if (error.name === "TokenExpiredError") {
        const refreshToken = getRefreshTokenFromRequest(req);

        if (!refreshToken) {
          throw new Error("Access token expired. Please login again");
        }

        try {
          // Verify refresh token
          const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
          );

          // Get user and check refresh token exists
          const user = await User.findById(decoded.id);
          const tokenExists = user.refreshTokens.find(
            (t) => t.token === refreshToken
          );

          if (!user || !tokenExists) {
            throw new Error("Invalid refresh token");
          }

          // Generate new tokens
          const accessToken = user.generateAuthToken();
          const newRefreshToken = user.generateRefreshToken();

          // Remove old refresh token
          await user.removeRefreshToken(refreshToken);
          await user.save();

          // Set new cookies
          setNewCookies(res, {
            accessToken,
            refreshToken: newRefreshToken,
          });

          // Add user to request
          req.user = user;

          authLog.success("Token refreshed successfully", {
            userId: user._id,
            route: req.originalUrl,
          });

          next();
        } catch (refreshError) {
          throw new Error("Session expired. Please login again");
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    authLog.error("Authentication failed", {
      message: error?.message || "Authentication error",
      route: req.originalUrl,
      ip: req.ip,
    });

    res.status(401).json({
      success: false,
      message: error?.message || "Not authorized to access this route",
    });
  }
};

/**
 * Role Authorization Middleware
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Convert string roles to numbers for new role system
    const numericRoles = roles.map((role) => {
      if (role === "admin") return 1;
      if (role === "user") return 0;
      return parseInt(role);
    });

    if (!numericRoles.includes(req.user.role)) {
      authLog.error("Authorization failed - insufficient role", null, {
        userId: req.user._id,
        userRole: req.user.role,
        requiredRoles: numericRoles,
        route: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: `User role ${req.user.roleText} is not authorized to access this route`,
      });
    }

    next();
  };
};

exports.preventLoggedInAccess = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (token) {
      try {
        // Try to verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (user && user.status === 1) {
          return res.status(400).json({
            success: false,
            message: "You are already logged in. Please logout first.",
          });
        }
      } catch (error) {
        // If token verification fails, continue to next middleware
        // This handles expired tokens
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
