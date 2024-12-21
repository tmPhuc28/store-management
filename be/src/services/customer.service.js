// src/services/customer.service.js
const BaseService = require("./base/base.service");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const { checkDuplicate } = require("../utils/duplicateCheck");

class CustomerService extends BaseService {
  constructor() {
    super(Customer, "Customer");
    this.nullableFields = ["email", "address", "notes"];
    this.useHistory = true;
    this.useTransactions = true;
    this.excludeFields = [...this.excludeFields];
  }

  getSearchFields() {
    return ["name", "email", "phone"];
  }

  getPopulateConfig(view = "list") {
    const configs = {
      list: [
        { path: "createdBy", select: "username" },
        {
          path: "purchaseHistory",
          select: "invoiceNumber total createdAt status",
          options: { limit: 5, sort: { createdAt: -1 } },
        },
      ],
      detail: [
        { path: "createdBy", select: "username email" },
        { path: "updateHistory.updatedBy", select: "username" },
        {
          path: "purchaseHistory",
          select: "invoiceNumber total status createdAt paymentMethod items",
          populate: { path: "items.product", select: "name" },
        },
      ],
    };
    return configs[view] || configs.list;
  }

  buildCustomQuery(params) {
    const query = {};

    if (params.status !== undefined) {
      query.status = parseInt(params.status);
    }

    if (params.minPurchases) {
      query.totalPurchases = { $gte: parseInt(params.minPurchases) };
    }

    if (params.minSpent) {
      query.totalSpent = { $gte: parseFloat(params.minSpent) };
    }

    if (params.lastPurchaseFrom || params.lastPurchaseTo) {
      query.lastPurchaseDate = {};
      if (params.lastPurchaseFrom) {
        query.lastPurchaseDate.$gte = new Date(params.lastPurchaseFrom);
      }
      if (params.lastPurchaseTo) {
        query.lastPurchaseDate.$lte = new Date(params.lastPurchaseTo);
      }
    }

    return query;
  }

  async validateUnique(data, excludeId = null) {
    const checkFields = [];

    if (data.phone) {
      checkFields.push(
        checkDuplicate(
          this.model,
          { phone: data.phone },
          excludeId,
          "Phone number already registered"
        )
      );
    }

    if (data.email) {
      checkFields.push(
        checkDuplicate(
          this.model,
          { email: data.email.toLowerCase() },
          excludeId,
          "Email already registered"
        )
      );
    }

    await Promise.all(checkFields);
  }

  async validateStatusChange(document, status) {
    const baseValidation = await super.validateStatusChange(document, status);

    if (!baseValidation.isValid) {
      return baseValidation;
    }

    if (status === 0) {
      const hasActiveInvoices = await Invoice.exists({
        customer: document._id,
        status: { $in: ["pending", "confirmed"] },
      });

      if (hasActiveInvoices) {
        return {
          isValid: false,
          message: "Cannot deactivate customer with active invoices",
        };
      }
    }

    return { isValid: true };
  }

  async validateDelete(document) {
    if (document.purchaseHistory?.length > 0) {
      throw new Error(
        "Cannot delete customer with purchase history. Please deactivate instead."
      );
    }
    return true;
  }

  /**
   * Get customer statistics
   */
  async getCustomerStatistics(id) {
    try {
      const stats = await Invoice.aggregate([
        {
          $match: {
            customer: mongoose.Types.ObjectId(id),
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: "$total" },
            averageOrder: { $avg: "$total" },
            firstPurchase: { $min: "$createdAt" },
            lastPurchase: { $max: "$createdAt" },
            ordersByPaymentMethod: {
              $push: {
                method: "$paymentMethod",
                total: "$total",
              },
            },
          },
        },
        {
          $addFields: {
            paymentMethods: {
              $reduce: {
                input: "$ordersByPaymentMethod",
                initialValue: {},
                in: {
                  $mergeObjects: [
                    "$$value",
                    {
                      $let: {
                        vars: { method: "$$this.method" },
                        in: {
                          $object: {
                            k: ["$$method"],
                            v: {
                              count: 1,
                              total: "$$this.total",
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      ]);

      return stats[0] || null;
    } catch (error) {
      this.logger.error("Failed to get customer statistics", error);
      throw error;
    }
  }

  /**
   * Update customer purchase stats manually
   */
  async updateCustomerStats(id, session = null) {
    const customer = await this.getFullDocument(id);
    await customer.updatePurchaseStats(session);
    return customer;
  }
}

module.exports = new CustomerService();
