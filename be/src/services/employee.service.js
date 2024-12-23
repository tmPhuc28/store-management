const BaseService = require("./base/base.service");
const Employee = require("../models/Employee");
const { checkDuplicate } = require("../utils/duplicateCheck");

class EmployeeService extends BaseService {
  constructor() {
    super(Employee, "Employee");
    this.nullableFields = ["dateOfBirth", "gender", "address", "position"];
    this.useHistory = true;
    this.useTransactions = true;
    this.excludeFields = [...this.excludeFields];
  }

  /**
   * Define searchable fields
   */
  getSearchFields() {
    return ["firstName", "lastName", "phone", "position"];
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
   * Build custom query for employee specific filters
   */
  buildCustomQuery(params) {
    const query = {};

    // Handle status filter
    if (params.status !== undefined) {
      query.status = parseInt(params.status);
    }

    // Handle position filter (case-insensitive)
    if (params.position) {
      query.position = { $regex: params.position, $options: "i" };
    }

    // Handle gender filter (exact match)
    if (params.gender) {
      query.gender = params.gender;
    }

    // Handle phone filter (partial match)
    if (params.phone) {
      query.phone = { $regex: params.phone, $options: "i" };
    }

    // Handle email filter (case-insensitive)
    if (params.email) {
      query.email = { $regex: params.email, $options: "i" };
    }

    // Handle date range filter
    if (params.dateFrom || params.dateTo) {
      query.dateOfBirth = {};
      if (params.dateFrom) {
        query.dateOfBirth.$gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        query.dateOfBirth.$lte = new Date(params.dateTo);
      }
    }

    // Log cho debug
    this.logger.success("Custom query built for employee", {
      originalParams: params,
      builtQuery: query,
    });

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

    await Promise.all(checkFields);
  }
}

module.exports = new EmployeeService();
