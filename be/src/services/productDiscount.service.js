const BaseService = require("./base/base.service");
const ProductDiscount = require("../models/ProductDiscount");
const Product = require("../models/Product");
const { checkDuplicate } = require("../utils/duplicateCheck");

class ProductDiscountService extends BaseService {
  constructor() {
    super(ProductDiscount, "ProductDiscount");
    this.nullableFields = [
      "description",
      "endDate",
      "applicableProducts",
      "usageLimit",
    ];
    this.useHistory = true;
    this.useTransactions = true;
    this.excludeFields = [...this.excludeFields];
  }

  getSearchFields() {
    return ["name", "code", "description"];
  }

  getPopulateConfig(view = "list") {
    const configs = {
      list: [
        { path: "applicableProducts", select: "name code" },
        { path: "createdBy", select: "username" },
      ],
      detail: [
        { path: "applicableProducts", select: "name code sku" },
        { path: "createdBy", select: "username email" },
        { path: "updateHistory.updatedBy", select: "username email" },
      ],
    };
    return configs[view] || configs.list;
  }

  buildCustomQuery(params) {
    const query = {};

    if (params.status !== undefined) {
      query.status = parseInt(params.status);
    }

    if (params.product) {
      query.applicableProducts = params.product;
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

    if (params.autoApply !== undefined) {
      query.autoApply = params.autoApply === "true";
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

  async validateRelatedEntities(data) {
    if (data.applicableProducts?.length > 0) {
      const products = await Product.find({
        _id: { $in: data.applicableProducts },
        status: 1,
      });

      if (products.length !== data.applicableProducts.length) {
        throw new Error("Some products not found or inactive");
      }
    }
  }

  async create(data, user = null, options = {}) {
    const session = await this.startTransaction(options);

    try {
      await this.validateUnique(data);
      await this.validateRelatedEntities(data);

      const result = await super.create(data, user, { ...options, session });
      await this.endTransaction(session, true);
      return result;
    } catch (error) {
      await this.endTransaction(session, false);
      throw error;
    }
  }

  async update(id, data, user = null, options = {}) {
    const session = await this.startTransaction(options);

    try {
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
   * Get applicable discounts for a product
   */
  async getApplicableDiscounts(productId, options = { autoApplyOnly: false }) {
    try {
      const now = new Date();
      const query = {
        status: 1,
        startDate: { $lte: now },
        $or: [{ endDate: null }, { endDate: { $gt: now } }],
        $or: [
          { applicableProducts: { $size: 0 } },
          { applicableProducts: productId },
        ],
        $expr: {
          $or: [
            { $eq: ["$usageLimit", null] },
            { $gt: ["$usageLimit", "$usedCount"] },
          ],
        },
      };

      if (options.autoApplyOnly) {
        query.autoApply = true;
      }

      const discounts = await this.model
        .find(query)
        .sort({ priority: -1, value: -1 })
        .populate("applicableProducts", "name code");

      return this.processResponse(discounts);
    } catch (error) {
      this.logger.error("Failed to get applicable discounts", error);
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

module.exports = new ProductDiscountService();
