// src/controllers/auth.controller.js
const BaseController = require("./base/base.controller");
const AuthService = require("../services/auth.service");
const ResponseHandler = require("../utils/responseHandler");
class AuthController extends BaseController {
  constructor() {
    super(AuthService);
  }

  /**
   * Set authentication cookies
   */
  setAuthCookies(res, accessToken, refreshToken = null) {
    // Basic cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };

    // Set access token cookie with expiry in minutes
    res.cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: Number(process.env.JWT_COOKIE_EXPIRE) * 60 * 1000, // Convert minutes to milliseconds
    });

    // Set refresh token cookie if provided
    if (refreshToken) {
      res.cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: Number(process.env.JWT_REFRESH_COOKIE_EXPIRE) * 60 * 1000,
      });
    }
  }

  /**
   * Clear authentication cookies
   */
  clearAuthCookies(res) {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    res.cookie("accessToken", "none", {
      ...cookieOptions,
      expires: new Date(Date.now() + 10 * 1000),
    });

    res.cookie("refreshToken", "none", {
      ...cookieOptions,
      expires: new Date(Date.now() + 10 * 1000),
    });
  }

  /**
   * @desc    Register new user
   * @route   POST /api/v1/auth/register
   */
  register = async (req, res) => {
    try {
      this.validateRequest(req);

      const clientInfo = {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      };

      const user = await this.service.register(req.body, clientInfo);

      // Mask sensitive data
      user.password = undefined;
      user.refreshTokens = undefined;

      const response = ResponseHandler.success(
        { user },
        "Registration successful",
        201
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * @desc    Login user
   * @route   POST /api/v1/auth/login
   */
  login = async (req, res) => {
    try {
      this.validateRequest(req);

      const clientInfo = {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      };

      const { user, accessToken, refreshToken } = await this.service.login(
        req.body,
        clientInfo
      );

      // Set auth cookies
      this.setAuthCookies(res, accessToken, refreshToken);

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.refreshTokens;

      const response = ResponseHandler.success({
        user: userResponse,
        tokens: {
          accessToken,
          refreshToken,
        },
      });
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * @desc    Refresh access token
   * @route   POST /api/v1/auth/refresh-token
   */
  refreshToken = async (req, res) => {
    try {
      this.validateRequest(req);

      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
      if (!refreshToken) {
        throw new Error("Refresh token is required");
      }

      const clientInfo = {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      };

      const tokens = await this.service.refreshToken(refreshToken, clientInfo);

      // Set new cookies
      this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      const response = ResponseHandler.success({ tokens });
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * @desc    Logout user
   * @route   POST /api/v1/auth/logout
   */
  logout = async (req, res) => {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
      const clientInfo = {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      };

      await this.service.logout(req.user, refreshToken, clientInfo);

      // Clear cookies
      this.clearAuthCookies(res);

      const response = ResponseHandler.success(null, "Logged out successfully");
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * @desc    Logout from all devices
   * @route   POST /api/v1/auth/logout-all
   */
  logoutAll = async (req, res) => {
    try {
      const clientInfo = {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      };

      await this.service.logoutAll(req.user, clientInfo);

      // Clear cookies
      this.clearAuthCookies(res);

      const response = ResponseHandler.success(
        null,
        "Logged out from all devices successfully"
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * @desc    Get current user profile
   * @route   GET /api/v1/auth/me
   */
  getMe = async (req, res) => {
    try {
      const user = req.user;
      user.password = undefined;
      user.refreshTokens = undefined;

      const response = ResponseHandler.success({ user });
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };

  /**
   * @desc    Change password
   * @route   POST /api/v1/auth/change-password
   */
  changePassword = async (req, res) => {
    try {
      this.validateRequest(req);

      const clientInfo = {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      };

      await this.service.changePassword(
        req.user,
        req.body.currentPassword,
        req.body.newPassword,
        clientInfo
      );

      // Clear cookies as user will need to login again
      this.clearAuthCookies(res);

      const response = ResponseHandler.success(
        null,
        "Password changed successfully. Please login again."
      );
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      const response = ResponseHandler.error(error);
      res.status(response.statusCode).json(response.body);
    }
  };
}

module.exports = AuthController;
