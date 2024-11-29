// src/services/customer.service.js
const Customer = require("../models/Customer");
const normalizeData = require("../utils/normalizeData");
const { checkDuplicate } = require("../utils/duplicateCheck");
const {
  createHistoryRecord,
  mergeHistory,
} = require("../utils/historyHandler");
const { logAction } = require("../utils/logger");
const { validateGeneralStatusChange } = require("../utils/statusValidator");

const customerLog = logAction("Customer");

class CustomerService {
  constructor() {
    this.nullableFields = ["email", "address", "notes"];
    this.model = Customer;
  }

  async getCustomers(query = {}, user) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        status,
        sortBy = "-createdAt",
      } = query;

      const startIndex = (page - 1) * limit;
      let queryObj = {};

      // Build search query
      if (search) {
        queryObj.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ];
      }

      if (status !== undefined) {
        queryObj.status = parseInt(status);
      }

      const [total, customers] = await Promise.all([
        this.model.countDocuments(queryObj),
        this.model
          .find(queryObj)
          .populate("createdBy", "username")
          .populate({
            path: "purchaseHistory",
            select: "invoiceNumber total createdAt",
            options: { limit: 5, sort: { createdAt: -1 } },
          })
          .sort(sortBy)
          .skip(startIndex)
          .limit(parseInt(limit)),
      ]);

      customerLog.success("Retrieved customers list", {
        userId: user?._id,
        query: queryObj,
      });

      return {
        count: customers.length,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        data: customers,
      };
    } catch (error) {
      customerLog.error("Failed to retrieve customers", error);
      throw error;
    }
  }

  async validateCustomer(data, customerId = null) {
    // Check for duplicate email if provided
    if (data.email) {
      await checkDuplicate(
        this.model,
        { email: data.email.toLowerCase() },
        customerId,
        "Email already registered"
      );
    }

    // Check for duplicate phone
    if (data.phone) {
      await checkDuplicate(
        this.model,
        { phone: data.phone },
        customerId,
        "Phone number already registered"
      );
    }

    // Normalize address data if provided
    if (data.address) {
      Object.keys(data.address).forEach((key) => {
        if (data.address[key] === "") {
          data.address[key] = null;
        }
      });

      // If all address fields are null, set entire address to null
      if (Object.values(data.address).every((v) => v === null)) {
        data.address = null;
      }
    }

    return normalizeData(data, this.nullableFields);
  }

  async create(data, user) {
    try {
      const normalizedData = await this.validateCustomer(data);

      const customerData = {
        ...normalizedData,
        createdBy: user._id,
        status: data.status !== undefined ? parseInt(data.status) : 1,
        updateHistory: [createHistoryRecord(user, normalizedData, "create")],
      };

      const customer = await this.model.create(customerData);

      customerLog.success("Created customer", {
        customerId: customer._id,
        userId: user._id,
        customerData: normalizedData,
      });

      return customer;
    } catch (error) {
      customerLog.error("Failed to create customer", error);
      throw error;
    }
  }

  async update(id, data, user) {
    try {
      const customer = await this.getCustomerById(id, user);

      const normalizedData = await this.validateCustomer(data, id);

      const historyRecord = createHistoryRecord(user, normalizedData, "update");
      const updateHistory = mergeHistory(customer.updateHistory, historyRecord);

      const updatedCustomer = await this.model.findByIdAndUpdate(
        id,
        { ...normalizedData, updateHistory },
        { new: true }
      );

      customerLog.success("Updated customer", {
        customerId: id,
        userId: user._id,
        changes: normalizedData,
      });

      return updatedCustomer;
    } catch (error) {
      customerLog.error("Failed to update customer", error);
      throw error;
    }
  }

  async updateStatus(id, status, user) {
    try {
      const customer = await this.getCustomerById(id, user);

      const validation = validateGeneralStatusChange(customer, status);
      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      const historyRecord = createHistoryRecord(
        user,
        { status },
        "status_update"
      );
      const updateHistory = mergeHistory(customer.updateHistory, historyRecord);

      const updatedCustomer = await this.model.findByIdAndUpdate(
        id,
        { status, updateHistory },
        { new: true }
      );

      customerLog.success("Updated customer status", {
        customerId: id,
        userId: user._id,
        oldStatus: customer.status,
        newStatus: status,
      });

      return updatedCustomer;
    } catch (error) {
      customerLog.error("Failed to update customer status", error);
      throw error;
    }
  }

  async delete(id, user) {
    try {
      const customer = await this.getCustomerById(id, user);

      // Check if customer can be deleted
      if (customer.purchaseHistory && customer.purchaseHistory.length > 0) {
        throw new Error(
          "Cannot delete customer with purchase history. Please deactivate instead."
        );
      }

      await customer.deleteOne();

      customerLog.success("Deleted customer", {
        customerId: id,
        userId: user._id,
        customerName: customer.name,
      });

      return { message: "Customer deleted successfully" };
    } catch (error) {
      customerLog.error("Failed to delete customer", error);
      throw error;
    }
  }

  async getCustomerById(id, user) {
    const customer = await this.model.findById(id).populate({
      path: "purchaseHistory",
      select: "invoiceNumber total createdAt paymentStatus paymentMethod",
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    return customer;
  }

  // Thêm phương thức thống kê
  async getCustomerStatistics(customerId, user) {
    try {
      const customer = await this.getCustomerById(customerId, user);

      const stats = await this.model.aggregate([
        { $match: { _id: customer._id } },
        {
          $lookup: {
            from: "invoices",
            localField: "purchaseHistory",
            foreignField: "_id",
            as: "invoices",
          },
        },
        {
          $project: {
            totalPurchases: { $size: "$invoices" },
            totalSpent: { $sum: "$invoices.total" },
            averageOrderValue: { $avg: "$invoices.total" },
            firstPurchase: { $min: "$invoices.createdAt" },
            lastPurchase: { $max: "$invoices.createdAt" },
            paymentMethods: "$invoices.paymentMethod",
          },
        },
      ]);

      return stats[0];
    } catch (error) {
      customerLog.error("Failed to get customer statistics", error);
      throw error;
    }
  }
}

module.exports = new CustomerService();
