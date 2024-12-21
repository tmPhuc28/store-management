const BaseService = require("./base/base.service");
const Manufacturer = require("../models/Manufacturer");
const { checkDuplicate } = require("../utils/duplicateCheck");

class ManufacturerService extends BaseService {
  constructor() {
    super(Manufacturer, "Manufacturer");
    this.nullableFields = [
      "description",
      "phone",
      "email",
      "website",
      "taxCode",
      "address",
      "contacts",
      "logo",
    ];
    this.useHistory = true;
    this.useTransactions = true;
    this.excludeFields = [...this.excludeFields];
  }

  /**
   * Define searchable fields
   */
  getSearchFields() {
    return ["name", "code", "phone", "email"];
  }

  /**
   * Define populate config
   */
  getPopulateConfig(view = "list") {
    const configs = {
      list: [{ path: "createdBy", select: "username" }],
      detail: [
        { path: "createdBy", select: "username email" },
        { path: "updateHistory.updatedBy", select: "username" },
      ],
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

    return query;
  }

  /**
   * Validate unique fields
   */
  async validateUnique(data, excludeId = null) {
    if (data.code) {
      await checkDuplicate(
        this.model,
        { code: data.code.toUpperCase() },
        excludeId,
        "Manufacturer code already exists"
      );
    }

    if (data.email) {
      await checkDuplicate(
        this.model,
        { email: data.email.toLowerCase() },
        excludeId,
        "Email already registered to another manufacturer"
      );
    }
  }

  /**
   * Validate delete
   */
  async validateDelete(document) {
    // Check if manufacturer has any associated products
    const Product = require("../models/Product");
    const hasProducts = await Product.exists({ manufacturer: document._id });
    if (hasProducts) {
      throw new Error(
        "Cannot delete manufacturer that has associated products. Please remove all products first or deactivate the manufacturer instead."
      );
    }
    return true;
  }
}

module.exports = new ManufacturerService();
