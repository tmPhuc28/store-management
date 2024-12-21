// src/utils/queryBuilder.js
class QueryBuilder {
  constructor(searchFields = ["name", "description"]) {
    this.searchFields = searchFields;
  }

  /**
   * Build MongoDB query from parameters
   */
  build(params = {}) {
    const query = {};
    const { search, status, startDate, endDate, ...filters } = params;

    // Add search condition
    if (search) {
      query.$or = this.searchFields.map((field) => ({
        [field]: { $regex: search, $options: "i" },
      }));
    }

    // Add status filter
    if (status !== undefined) {
      query.status = parseInt(status);
    }

    // Add date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Add additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query[key] = value;
      }
    });

    return query;
  }

  /**
   * Build sort options
   */
  buildSort(sortStr = "-createdAt") {
    const sort = {};
    const fields = sortStr.split(",");

    fields.forEach((field) => {
      if (field.startsWith("-")) {
        sort[field.substring(1)] = -1;
      } else {
        sort[field] = 1;
      }
    });

    return sort;
  }

  /**
   * Build pagination options
   */
  buildPagination(page = 1, limit = 10) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    return {
      skip,
      limit: parseInt(limit),
    };
  }
}

module.exports = QueryBuilder;
