// src/services/discount.service.js
const Discount = require("../models/Discount");
const {
  createHistoryRecord,
  mergeHistory,
} = require("../utils/historyHandler");
const { logAction } = require("../utils/logger");
const { validateGeneralStatusChange } = require("../utils/statusValidator");

const discountLog = logAction("Discount");

class DiscountService {
  constructor() {
    this.model = Discount;
  }

  async getDiscounts(query = {}, user) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        status,
        type,
        isActive,
        sortBy = "-createdAt",
      } = query;

      const startIndex = (page - 1) * limit;
      let queryObj = {};

      // Build search query
      if (search) {
        queryObj.$or = [
          { code: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      // Status filter
      if (status !== undefined) {
        queryObj.status = parseInt(status);
      }

      // Type filter
      if (type) {
        queryObj.type = type;
      }

      // Active filter
      if (isActive !== undefined) {
        const now = new Date();
        if (isActive === "true") {
          queryObj = {
            ...queryObj,
            startDate: { $lte: now },
            $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }],
            usageLimit: { $gt: 0 },
          };
        }
      }

      const [total, discounts] = await Promise.all([
        this.model.countDocuments(queryObj),
        this.model
          .find(queryObj)
          .populate("createdBy", "username")
          .sort(sortBy)
          .skip(startIndex)
          .limit(parseInt(limit)),
      ]);

      // Calculate remaining uses for each discount
      const discountsWithRemaining = discounts.map((discount) => {
        const remaining = discount.usageLimit
          ? discount.usageLimit - discount.usedCount
          : "Unlimited";
        return {
          ...discount.toObject(),
          remainingUses: remaining,
        };
      });

      discountLog.success("Retrieved discounts list", {
        userId: user._id,
        query: queryObj,
      });

      return {
        count: discounts.length,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        data: discountsWithRemaining,
      };
    } catch (error) {
      discountLog.error("Failed to retrieve discounts", error);
      throw error;
    }
  }

  async validateDiscount(code, orderValue) {
    try {
      const discount = await this.model.findOne({
        code: code.toUpperCase(),
        status: 1,
      });

      if (!discount) {
        throw new Error("Discount code not found");
      }

      // Check if discount is active
      const now = new Date();
      if (
        now < discount.startDate ||
        (discount.endDate && now > discount.endDate)
      ) {
        throw new Error("Discount code has expired or not yet active");
      }

      // Check usage limit
      if (
        discount.usageLimit !== null &&
        discount.usedCount >= discount.usageLimit
      ) {
        throw new Error("Discount code has reached its usage limit");
      }

      // Check minimum order value
      if (orderValue < discount.minOrderValue) {
        throw new Error(
          `Order value must be at least ${discount.minOrderValue}`
        );
      }

      // Calculate discount amount
      let discountAmount;
      if (discount.type === "percentage") {
        discountAmount = (orderValue * discount.value) / 100;
        if (discount.maxDiscount) {
          discountAmount = Math.min(discountAmount, discount.maxDiscount);
        }
      } else {
        discountAmount = discount.value;
      }

      return {
        discountId: discount._id,
        code: discount.code,
        type: discount.type,
        value: discount.value,
        discountAmount,
        description: discount.description,
      };
    } catch (error) {
      discountLog.error("Discount validation failed", error);
      throw error;
    }
  }
  async create(data, user) {
    try {
      // Check for duplicate code
      const existingDiscount = await this.model.findOne({
        code: data.code.toUpperCase(),
        status: 1,
      });

      if (existingDiscount) {
        throw new Error("Discount code already exists");
      }

      // Validate dates
      const now = new Date();
      if (new Date(data.startDate) < now) {
        throw new Error("Start date cannot be in the past");
      }

      if (data.endDate && new Date(data.endDate) <= new Date(data.startDate)) {
        throw new Error("End date must be after start date");
      }

      // Set maximum discount value for percentage type
      if (data.type === "percentage") {
        if (data.value < 0 || data.value > 100) {
          throw new Error("Percentage value must be between 0 and 100");
        }
      }

      const discountData = {
        ...data,
        code: data.code.toUpperCase(),
        createdBy: user._id,
        status: data.status !== undefined ? parseInt(data.status) : 1,
        updateHistory: [createHistoryRecord(user, data, "create")],
      };

      const discount = await this.model.create(discountData);

      discountLog.success("Created discount", {
        discountId: discount._id,
        userId: user._id,
        code: discount.code,
      });

      return discount;
    } catch (error) {
      discountLog.error("Failed to create discount", error);
      throw error;
    }
  }

  async update(id, data, user) {
    try {
      const discount = await this.getDiscountById(id);

      // Check code uniqueness if changed
      if (data.code && data.code.toUpperCase() !== discount.code) {
        const existingDiscount = await this.model.findOne({
          code: data.code.toUpperCase(),
          status: 1,
          _id: { $ne: id },
        });

        if (existingDiscount) {
          throw new Error("Discount code already exists");
        }
      }

      // Validate dates
      if (data.startDate && new Date(data.startDate) < new Date()) {
        throw new Error("Start date cannot be in the past");
      }

      if (
        data.endDate &&
        new Date(data.endDate) <= new Date(data.startDate || discount.startDate)
      ) {
        throw new Error("End date must be after start date");
      }

      // Create history record
      const historyRecord = createHistoryRecord(user, data, "update");
      const updateHistory = mergeHistory(discount.updateHistory, historyRecord);

      const updatedDiscount = await this.model.findByIdAndUpdate(
        id,
        {
          ...data,
          code: data.code?.toUpperCase(),
          updateHistory,
        },
        { new: true }
      );

      discountLog.success("Updated discount", {
        discountId: id,
        userId: user._id,
        changes: data,
      });

      return updatedDiscount;
    } catch (error) {
      discountLog.error("Failed to update discount", error);
      throw error;
    }
  }

  async updateStatus(id, status, user) {
    try {
      const discount = await this.getDiscountById(id);

      const validation = validateGeneralStatusChange(discount, status);
      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      const historyRecord = createHistoryRecord(
        user,
        { status },
        "status_update"
      );
      const updateHistory = mergeHistory(discount.updateHistory, historyRecord);

      const updatedDiscount = await this.model.findByIdAndUpdate(
        id,
        { status, updateHistory },
        { new: true }
      );

      discountLog.success("Updated discount status", {
        discountId: id,
        userId: user._id,
        oldStatus: discount.status,
        newStatus: status,
      });

      return updatedDiscount;
    } catch (error) {
      discountLog.error("Failed to update discount status", error);
      throw error;
    }
  }

  async delete(id, user) {
    try {
      const discount = await this.getDiscountById(id);

      // Check if discount has been used
      if (discount.usedCount > 0) {
        throw new Error("Cannot delete discount that has been used");
      }

      await discount.deleteOne();

      discountLog.success("Deleted discount", {
        discountId: id,
        userId: user._id,
        code: discount.code,
      });

      return { message: "Discount deleted successfully" };
    } catch (error) {
      discountLog.error("Failed to delete discount", error);
      throw error;
    }
  }

  async incrementUsage(id) {
    try {
      await this.model.findByIdAndUpdate(id, {
        $inc: { usedCount: 1 },
      });
    } catch (error) {
      discountLog.error("Failed to increment usage count", error);
      throw error;
    }
  }

  async getDiscountStatistics(query = {}) {
    try {
      const stats = await this.model.aggregate([
        {
          $match: { status: 1 },
        },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
            totalUsed: { $sum: "$usedCount" },
            avgValue: { $avg: "$value" },
          },
        },
      ]);

      const activeDiscounts = await this.model.countDocuments({
        status: 1,
        startDate: { $lte: new Date() },
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: new Date() } },
        ],
      });

      return {
        totalActive: activeDiscounts,
        byType: stats,
      };
    } catch (error) {
      discountLog.error("Failed to get discount statistics", error);
      throw error;
    }
  }

  async getDiscountById(id) {
    const discount = await this.model.findById(id);
    if (!discount) {
      throw new Error("Discount not found");
    }
    return discount;
  }
}

module.exports = new DiscountService();
