const BaseService = require("./base/base.service");
const ProductLocation = require("../models/ProductLocation");
const Product = require("../models/Product");

class ProductLocationService extends BaseService {
  constructor() {
    super(ProductLocation, "ProductLocation");
    this.nullableFields = ["zone.shelf", "zone.bin", "maxQuantity", "notes"];
    this.useHistory = true;
    this.useTransactions = true;
    this.excludeFields = [...this.excludeFields];
  }

  getSearchFields() {
    return [
      "zone.warehouse",
      "zone.area",
      "zone.rack",
      "zone.shelf",
      "zone.bin",
      "notes",
    ];
  }

  getPopulateConfig(view = "list") {
    const configs = {
      list: [
        { path: "product", select: "name code" },
        { path: "createdBy", select: "username" },
      ],
      detail: [
        { path: "product", select: "name code sku" },
        { path: "createdBy", select: "username email" },
        { path: "updateHistory.updatedBy", select: "username email" },
      ],
    };
    return configs[view] || configs.list;
  }

  buildCustomQuery(params) {
    const query = {};

    if (params.product) {
      query.product = params.product;
    }

    if (params.status !== undefined) {
      query.status = parseInt(params.status);
    }

    if (params.warehouse) {
      query["zone.warehouse"] = params.warehouse;
    }

    if (params.area) {
      query["zone.area"] = params.area;
    }

    if (params.rack) {
      query["zone.rack"] = params.rack;
    }

    if (params.hasAvailableSpace !== undefined) {
      if (params.hasAvailableSpace === "true") {
        query.$or = [
          { maxQuantity: null },
          { $expr: { $lt: ["$quantity", "$maxQuantity"] } },
        ];
      } else {
        query.$and = [
          { maxQuantity: { $ne: null } },
          { $expr: { $gte: ["$quantity", "$maxQuantity"] } },
        ];
      }
    }

    return query;
  }

  async validateUnique(data, excludeId = null) {
    // Check for duplicate location
    if (data.zone) {
      const query = {
        product: data.product,
        "zone.warehouse": data.zone.warehouse,
        "zone.area": data.zone.area,
        "zone.rack": data.zone.rack,
        "zone.shelf": data.zone.shelf,
        "zone.bin": data.zone.bin,
      };

      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const exists = await this.model.findOne(query);
      if (exists) {
        throw new Error("Product location already exists");
      }
    }
  }

  async validateStatusChange(document, newStatus) {
    const baseValidation = await super.validateStatusChange(
      document,
      newStatus
    );
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // Cannot deactivate if location has stock
    if (newStatus === 0 && document.quantity > 0) {
      return {
        isValid: false,
        message: "Cannot deactivate location that has stock",
      };
    }

    return { isValid: true };
  }

  async create(data, user = null, options = {}) {
    const session = await this.startTransaction(options);

    try {
      // Validate product exists and is active
      const product = await Product.findOne({
        _id: data.product,
        status: 1,
      });

      if (!product) {
        throw new Error("Product not found or inactive");
      }

      const result = await super.create(data, user, { ...options, session });
      await this.endTransaction(session, true);
      return result;
    } catch (error) {
      await this.endTransaction(session, false);
      throw error;
    }
  }

  // Get distinct warehouses
  async getWarehouses() {
    try {
      const warehouses = await this.model.distinct("zone.warehouse", {
        status: 1,
      });
      return warehouses.sort();
    } catch (error) {
      this.logger.error("Failed to get warehouses", error);
      throw error;
    }
  }

  // Get areas by warehouse
  async getAreas(warehouse) {
    try {
      const areas = await this.model.distinct("zone.area", {
        "zone.warehouse": warehouse,
        status: 1,
      });
      return areas.sort();
    } catch (error) {
      this.logger.error("Failed to get areas", error);
      throw error;
    }
  }

  // Get product locations summary
  async getProductLocationsSummary(productId) {
    try {
      const locations = await this.model
        .find({
          product: productId,
          status: 1,
        })
        .select("-updateHistory");

      const totalQuantity = locations.reduce(
        (sum, loc) => sum + loc.quantity,
        0
      );

      const availableLocations = locations.filter(
        (loc) => loc.maxQuantity === null || loc.quantity < loc.maxQuantity
      );

      return {
        totalLocations: locations.length,
        activeLocations: locations.filter((loc) => loc.status === 1).length,
        totalQuantity,
        availableLocations: availableLocations.length,
        locations: this.processResponse(locations),
      };
    } catch (error) {
      this.logger.error("Failed to get product locations summary", error);
      throw error;
    }
  }
}

module.exports = new ProductLocationService();
