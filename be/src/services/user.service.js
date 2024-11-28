// src/services/user.service.js
const User = require("../models/User");
const normalizeData = require("../utils/normalizeData");
const { checkDuplicate } = require("../utils/duplicateCheck");
const {
  createHistoryRecord,
  mergeHistory,
} = require("../utils/historyHandler");
const { logAction } = require("../utils/logger");
const { validateUserStatusChange } = require("../utils/statusValidator");

const userLog = logAction("User");

class UserService {
  constructor() {
    this.nullableFields = ["dateOfBirth", "gender", "phone", "address"];
    this.model = User;
  }

  async getUsers(query = {}, user) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        status,
        role,
        sortBy = "-createdAt",
      } = query;

      const startIndex = (page - 1) * limit;
      const queryObj = {};

      // Xây dựng query
      if (search) {
        queryObj.$or = [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ];
      }

      if (status !== undefined) {
        queryObj.status = parseInt(status);
      }

      if (role) {
        queryObj.role = role;
      }

      const [total, users] = await Promise.all([
        this.model.countDocuments(queryObj),
        this.model
          .find(queryObj)
          .select("-password -refreshTokens")
          .sort(sortBy)
          .skip(startIndex)
          .limit(parseInt(limit)),
      ]);

      userLog.success("Retrieved users list", {
        adminId: user._id,
        query: queryObj,
      });

      return {
        count: users.length,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        data: users,
      };
    } catch (error) {
      userLog.error("Failed to retrieve users", error);
      throw error;
    }
  }

  async getUserById(id, requestingUser) {
    try {
      const user = await this.model
        .findById(id)
        .select("-password -refreshTokens");

      if (!user) {
        throw new Error("User not found");
      }

      userLog.success("Retrieved user details", {
        userId: id,
        requestedBy: requestingUser._id,
      });

      return user;
    } catch (error) {
      userLog.error("Failed to retrieve user", error, {
        userId: id,
        requestedBy: requestingUser._id,
      });
      throw error;
    }
  }

  async updateUser(id, updateData, requestingUser) {
    try {
      const user = await this.getUserById(id, requestingUser);

      // Kiểm tra trùng lặp email/username/phone
      if (updateData.email && updateData.email !== user.email) {
        await checkDuplicate(
          this.model,
          { email: updateData.email },
          id,
          "Email already in use"
        );
      }

      if (updateData.username && updateData.username !== user.username) {
        await checkDuplicate(
          this.model,
          { username: updateData.username },
          id,
          "Username already in use"
        );
      }

      if (updateData.phone && updateData.phone !== user.phone) {
        await checkDuplicate(
          this.model,
          { phone: updateData.phone },
          id,
          "Phone number already in use"
        );
      }

      // Normalize data
      const normalizedData = normalizeData(updateData, this.nullableFields);

      // Create history record
      const historyRecord = createHistoryRecord(
        requestingUser,
        normalizedData,
        "update"
      );
      const updateHistory = mergeHistory(user.updateHistory, historyRecord);

      // Update user
      const updatedUser = await this.model
        .findByIdAndUpdate(
          id,
          {
            ...normalizedData,
            updateHistory,
          },
          { new: true }
        )
        .select("-password -refreshTokens");

      userLog.success("Updated user", {
        userId: id,
        updatedBy: requestingUser._id,
        changes: normalizedData,
      });

      return updatedUser;
    } catch (error) {
      userLog.error("Failed to update user", error, {
        userId: id,
        updatedBy: requestingUser._id,
        updateData,
      });
      throw error;
    }
  }

  async updateStatus(id, status, requestingUser) {
    try {
      const user = await this.getUserById(id, requestingUser);

      // Validate status change
      const validation = validateUserStatusChange(user, status, requestingUser);
      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      // Create history record
      const historyRecord = createHistoryRecord(
        requestingUser,
        { status },
        "status_update"
      );
      const updateHistory = mergeHistory(user.updateHistory, historyRecord);

      const updatedUser = await this.model
        .findByIdAndUpdate(id, { status, updateHistory }, { new: true })
        .select("-password -refreshTokens");

      // Log out user if deactivated
      if (status === 0) {
        await user.removeAllRefreshTokens();
        await user.logActivity("account_deactivated", {
          deactivatedBy: requestingUser._id,
        });
      }

      userLog.success("Updated user status", {
        userId: id,
        updatedBy: requestingUser._id,
        oldStatus: user.status,
        newStatus: status,
      });

      return updatedUser;
    } catch (error) {
      userLog.error("Failed to update user status", error, {
        userId: id,
        updatedBy: requestingUser._id,
        status,
      });
      throw error;
    }
  }

  async deleteUser(id, requestingUser) {
    try {
      const user = await this.getUserById(id, requestingUser);

      // Prevent self-deletion
      if (user._id.toString() === requestingUser._id.toString()) {
        throw new Error("Cannot delete your own account");
      }

      await user.deleteOne();

      userLog.success("Deleted user", {
        deletedUserId: id,
        deletedBy: requestingUser._id,
      });

      return { message: "User deleted successfully" };
    } catch (error) {
      userLog.error("Failed to delete user", error, {
        userId: id,
        deletedBy: requestingUser._id,
      });
      throw error;
    }
  }
}

module.exports = new UserService();
