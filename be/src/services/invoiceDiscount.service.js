const BaseService = require("./base/base.service");
const InvoiceDiscount = require("../models/InvoiceDiscount");
const { checkDuplicate } = require("../utils/duplicateCheck");

class InvoiceDiscountService extends BaseService {
  constructor() {
    super(InvoiceDiscount, "InvoiceDiscount");
    this.nullableFields = [
      "description",
      "endDate",
      "minOrderValue",
      "maxDiscount",
      "usageLimit",
    ];
    this.useHistory = true;
    this.useTransactions = true;
    this.excludeFields = [...this.excludeFields];
  }

  getSearchFields() {
    return ["name", "code", "description"];
  }

  buildCustomQuery(params) {
    const query = {};

    if (params.status !== undefined) {
      query.status = parseInt(params.status);
    }

    if (params.isActive !== undefined) {
      if (params.isActive === "true") {
        const now = new Date();
        query.status = 1;
        query.startDate = { $lte: now };
        query.$or = [{ endDate: null }, { endDate: { $gt: now } }];
        query.$expr = {
          $or: [
            { $eq: ["$usageLimit", null] },
            { $gt: ["$usageLimit", "$usedCount"] },
          ],
        };
      } else {
        query.$or = [
          { status: 0 },
          { startDate: { $gt: now } },
          { endDate: { $lte: now } },
          {
            $and: [
              { usageLimit: { $ne: null } },
              { $expr: { $gte: ["$usedCount", "$usageLimit"] } },
            ],
          },
        ];
      }
    }

    if (params.minOrderValue) {
      query.minOrderValue = { $lte: parseFloat(params.minOrderValue) };
    }

    return query;
  }

  async validateUnique(data, excludeId = null) {
    if (data.code) {
      await checkDuplicate(
        this.model,
        { code: data.code.toUpperCase() },
        excludeId,
        "Discount code already exists"
      );
    }
  }

  /**
   * Validate discount code
   */
  async validateCode(code, orderValue) {
    try {
      const discount = await this.model.findOne({
        code: code.toUpperCase(),
        status: 1,
      });

      if (!discount) {
        throw new Error("Invalid discount code");
      }

      const now = new Date();
      if (
        now < discount.startDate ||
        (discount.endDate && now > discount.endDate)
      ) {
        throw new Error("Discount code has expired or not yet active");
      }

      if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
        throw new Error("Discount code has reached its usage limit");
      }

      if (orderValue < discount.minOrderValue) {
        throw new Error(
          `Order value must be at least ${discount.minOrderValue}`
        );
      }

      return this.processResponse(discount);
    } catch (error) {
      this.logger.error("Discount code validation failed", error);
      throw error;
    }
  }

  /**
   * Calculate discount amount
   */
  async calculateDiscount(id, orderValue) {
    try {
      const discount = await this.getFullDocument(id);

      if (discount.type === "percentage") {
        const amount = (orderValue * discount.value) / 100;
        return discount.maxDiscount
          ? Math.min(amount, discount.maxDiscount)
          : amount;
      }

      return Math.min(discount.value, orderValue);
    } catch (error) {
      this.logger.error("Failed to calculate discount", error);
      throw error;
    }
  }

  /**
   * Increment usage count
   */
  async incrementUsage(id) {
    try {
      const discount = await this.model.findById(id);

      if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
        throw new Error("Discount usage limit reached");
      }

      await this.model.findByIdAndUpdate(id, {
        $inc: { usedCount: 1 },
      });
    } catch (error) {
      this.logger.error("Failed to increment usage count", error);
      throw error;
    }
  }
}

module.exports = new InvoiceDiscountService();
