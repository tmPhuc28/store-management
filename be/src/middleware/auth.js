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
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
    domain: process.env.COOKIE_DOMAIN || undefined,
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
  res.set("Authorization", `Bearer ${accessToken}`);
  return {
    accessToken,
    refreshToken,
  };
};

async function refreshUserTokens(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    const tokenExists = user?.refreshTokens?.find(
      (t) => t.token === refreshToken
    );
    if (!user || !tokenExists) {
      return null;
    }

    // Generate new tokens
    const accessToken = user.generateAuthToken();
    const newRefreshToken = user.generateRefreshToken();

    // Update refresh tokens
    await user.removeRefreshToken(refreshToken);
    await user.save();

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Authentication & Authorization Middleware
 */
exports.protect = async (req, res, next) => {
  try {
    let token = getTokenFromRequest(req);

    if (!token) {
      // Thử refresh nếu không có access token nhưng có refresh token
      const refreshToken = getRefreshTokenFromRequest(req);
      if (refreshToken) {
        const newTokens = await refreshUserTokens(refreshToken);
        if (newTokens) {
          // Set cookies mới
          setNewCookies(res, newTokens);
          token = newTokens.accessToken;
        }
      }

      if (!token) {
        throw new Error("Not authorized to access this route");
      }
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id)
        .select("+password")
        .populate("employee", "firstName lastName");

      if (!user || user.status !== 1) {
        throw new Error("User not found or inactive");
      }

      if (user.hasPasswordChangedAfterToken?.(decoded.iat)) {
        throw new Error("Password changed. Please login again");
      }

      req.user = user;
      return next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        // Thử refresh token
        const refreshToken = getRefreshTokenFromRequest(req);
        if (!refreshToken) {
          throw new Error("Session expired. Please login again");
        }

        const newTokens = await refreshUserTokens(refreshToken);
        if (!newTokens) {
          throw new Error("Invalid refresh token");
        }

        // Set cookies mới và retry request
        setNewCookies(res, newTokens);
        req.cookies.accessToken = newTokens.accessToken;
        return exports.protect(req, res, next);
      }
      throw error;
    }
  } catch (error) {
    authLog.error("Authentication failed", {
      message: error?.message || "Authentication error",
      route: req.originalUrl,
    });

    return res.status(401).json({
      success: false,
      message: error?.message || "Authentication failed",
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
