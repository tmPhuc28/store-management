// src/services/user.service.js
const BaseService = require("./base/base.service");
const User = require("../models/User");
const { checkDuplicate } = require("../utils/duplicateCheck");
const { validateUserStatusChange } = require("../utils/statusValidator");

class UserService extends BaseService {
  constructor() {
    super(User, "User");
    this.useHistory = true;
    this.useTransactions = true;
    this.excludeFields = [...this.excludeFields];
    this.excludeFields = [
      ...this.excludeFields,
      "password",
      "refreshTokens",
      "resetPasswordToken",
      "resetPasswordExpire",
    ];
  }

  /**
   * Override update method to validate related entities
   */
  async update(id, data, user, options = {}) {
    const session = await this.startTransaction(options);
    try {
      // Add role change validation
      if (data.role !== undefined) {
        await this.validateRoleChange(id, data.role, user);
      }
      await this.validateUnique(data, id);
      await this.validateRelatedEntities(data);

      const result = await super.update(id, data, user, {
        ...options,
        session,
      });

      await this.endTransaction(session, true);
      return result;
    } catch (error) {
      await this.endTransaction(session, false);
      throw error;
    }
  }

  /**
   * Override updateStatus method to use validateUserStatusChange
   */
  async updateStatus(id, status, user, options = {}) {
    const session = await this.startTransaction(options);
    try {
      // Get document for validation
      const document = await this.getFullDocument(id);

      // User-specific status validation
      const validationResult = await validateUserStatusChange(
        document,
        status,
        user
      );
      if (!validationResult.isValid) {
        throw new Error(validationResult.message);
      }

      // Use base service updateStatus with validated data
      const result = await super.updateStatus(id, status, user, {
        ...options,
        session,
      });

      await this.endTransaction(session, true);
      return result;
    } catch (error) {
      await this.endTransaction(session, false);
      throw error;
    }
  }

  /**
   * Validate related entities
   */
  async validateRelatedEntities(data) {
    // Validate employee if being updated
    if (data.employee) {
      const employee = await Employee.findOne({
        _id: data.employee,
        status: 1,
      });
      if (!employee) {
        throw new Error("Employee not found or inactive");
      }

      // Check if employee is already linked to another user
      const existingUser = await this.model.findOne({
        employee: data.employee,
        _id: { $ne: data._id }, // Exclude current user
      });
      if (existingUser) {
        throw new Error("Employee is already linked to another user");
      }
    }
  }

  /**
   * Define searchable fields
   */
  getSearchFields() {
    return ["username", "email"];
  }

  /**
   * Define populate config based on view
   */
  getPopulateConfig(view = "list") {
    const configs = {
      list: [
        { path: "employee", select: "firstName lastName phone" },
        { path: "updateHistory.updatedBy", select: "username email" },
      ],
      detail: [
        { path: "employee", select: "firstName lastName phone email address" },
        { path: "updateHistory.updatedBy", select: "username email" },
      ],
      select: [{ path: "employee", select: "firstName lastName" }],
    };
    return configs[view] || configs.list;
  }

  /**
   * Build custom query
   */
  buildCustomQuery(params) {
    const query = {};

    if (params.status !== undefined) {
      query.status = parseInt(params.status);
    }

    if (params.role !== undefined) {
      query.role = parseInt(params.role);
    }

    if (params.employee) {
      query.employee = params.employee;
    }

    // Date range for created/updated
    if (params.startDate || params.endDate) {
      query.createdAt = {};
      if (params.startDate) {
        query.createdAt.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        query.createdAt.$lte = new Date(params.endDate);
      }
    }

    // Last login date range
    if (params.lastLoginStart || params.lastLoginEnd) {
      query["lastLogin.timestamp"] = {};
      if (params.lastLoginStart) {
        query["lastLogin.timestamp"].$gte = new Date(params.lastLoginStart);
      }
      if (params.lastLoginEnd) {
        query["lastLogin.timestamp"].$lte = new Date(params.lastLoginEnd);
      }
    }

    return query;
  }

  /**
   * Override validateUnique to include additional checks
   */
  async validateUnique(data, excludeId = null) {
    const checkFields = [];

    if (data.username) {
      checkFields.push(
        checkDuplicate(
          this.model,
          { username: data.username.toLowerCase() },
          excludeId,
          "Username already in use"
        )
      );
    }

    if (data.email) {
      checkFields.push(
        checkDuplicate(
          this.model,
          { email: data.email.toLowerCase() },
          excludeId,
          "Email already in use"
        )
      );

      // Also check if email exists in Employee collection
      const employeeWithEmail = await Employee.findOne({
        email: data.email.toLowerCase(),
        _id: { $ne: data.employee },
      });
      if (employeeWithEmail) {
        throw new Error("Email already used by another employee");
      }
    }

    await Promise.all(checkFields);
  }

  /**
   * Additional validations
   */
  async validateDelete(document, requestUser) {
    // Prevent self-deletion
    if (document._id.toString() === requestUser._id.toString()) {
      throw new Error("Cannot delete your own account");
    }

    // Check if user has active sessions
    if (document.refreshTokens.length > 0) {
      throw new Error("User has active sessions. Please log them out first.");
    }

    // Check if user is last admin
    if (document.role === 1) {
      const adminCount = await this.model.countDocuments({
        role: 1,
        status: 1,
      });
      if (adminCount <= 1) {
        throw new Error("Cannot delete last admin user");
      }
    }

    return true;
  }

  /**
   * Process response
   */
  processResponse(document) {
    if (!document) return null;

    const processed = super.processResponse(document);

    // Add additional computed fields if needed
    if (Array.isArray(processed)) {
      processed.forEach((doc) => {
        doc.hasActiveSessions = doc.refreshTokens?.length > 0;
        doc.lastLoginAgo = doc.lastLogin
          ? this.getTimeAgo(doc.lastLogin.timestamp)
          : null;
      });
    } else {
      processed.hasActiveSessions = processed.refreshTokens?.length > 0;
      processed.lastLoginAgo = processed.lastLogin
        ? this.getTimeAgo(processed.lastLogin.timestamp)
        : null;
    }

    return processed;
  }

  /**
   * Helper method to calculate time ago
   */
  getTimeAgo(date) {
    if (!date) return null;

    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";

    return Math.floor(seconds) + " seconds ago";
  }

  async validateRoleChange(id, newRole, requestUser) {
    // Get the user being updated
    const targetUser = await this.model.findById(id);
    if (!targetUser) {
      throw new Error("User not found");
    }

    // If changing from admin to user
    if (targetUser.role === 1 && newRole === 0) {
      // Check if this is the last admin
      const adminCount = await this.model.countDocuments({
        role: 1,
        status: 1,
      });
      if (adminCount <= 1) {
        throw new Error("Cannot demote the last admin");
      }
    }

    // Prevent self-role downgrade for admins
    if (
      targetUser._id.toString() === requestUser._id.toString() &&
      targetUser.role === 1 &&
      newRole === 0
    ) {
      throw new Error("Admins cannot downgrade their own role");
    }

    return true;
  }
}

module.exports = new UserService();
