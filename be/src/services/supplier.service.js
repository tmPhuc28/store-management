const BaseService = require("./base/base.service");
const Supplier = require("../models/Supplier");
const { checkDuplicate } = require("../utils/duplicateCheck");

class SupplierService extends BaseService {
  constructor() {
    super(Supplier, "Supplier");
    this.nullableFields = [
      "description",
      "phone",
      "email",
      "website",
      "taxCode",
      "address",
      "contacts",
      "bankInfo",
      "paymentTerms",
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
        { path: "updateHistory.updatedBy", select: "username email" },
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
        "Supplier code already exists"
      );
    }

    if (data.email) {
      await checkDuplicate(
        this.model,
        { email: data.email.toLowerCase() },
        excludeId,
        "Email already registered to another supplier"
      );
    }
  }

  /**
   * Validate delete
   */
  async validateDelete(document) {
    // Check if supplier has any associated products
    const Product = require("../models/Product");
    const hasProducts = await Product.exists({ supplier: document._id });
    if (hasProducts) {
      throw new Error(
        "Cannot delete supplier that has associated products. Please remove all products first or deactivate the supplier instead."
      );
    }
    return true;
  }

  /**
   * Override process response
   */
  processResponse(document) {
    if (!document) return null;

    const processed = super.processResponse(document);

    // Mask bank account number if exists
    if (Array.isArray(processed)) {
      processed.forEach((doc) => {
        if (doc.bankInfo?.accountNumber) {
          doc.bankInfo.accountNumber = this.maskAccountNumber(
            doc.bankInfo.accountNumber
          );
        }
      });
    } else if (processed.bankInfo?.accountNumber) {
      processed.bankInfo.accountNumber = this.maskAccountNumber(
        processed.bankInfo.accountNumber
      );
    }

    return processed;
  }

  /**
   * Helper method to mask account number
   */
  maskAccountNumber(accountNumber) {
    if (!accountNumber) return null;
    const length = accountNumber.length;
    const visibleDigits = 4;
    return (
      "*".repeat(length - visibleDigits) + accountNumber.slice(-visibleDigits)
    );
  }
}

module.exports = new SupplierService();
