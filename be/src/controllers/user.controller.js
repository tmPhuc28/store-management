// src/controllers/user.controller.js
const { validationResult } = require("express-validator");
const userService = require("../services/user.service");

exports.getUsers = async (req, res, next) => {
  try {
    const result = await userService.getUsers(req.query, req.user);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    if (error.message === "User not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await userService.updateUser(
      req.params.id,
      req.body,
      req.user
    );

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    if (error.message === "User not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message.includes("already in use")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const updatedUser = await userService.updateStatus(
      req.params.id,
      parseInt(req.body.status),
      req.user
    );

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    if (error.message === "User not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (
      error.message.includes("Cannot change") ||
      error.message.includes("Status must be")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const result = await userService.deleteUser(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error.message === "User not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message === "Cannot delete your own account") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};
