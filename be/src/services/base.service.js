const mongoose = require("mongoose");
const normalizeData = require("../utils/normalizeData");
const { logAction } = require("../utils/logger");

/**
 * Base Service class providing common functionality for all services
 * Core features:
 * 1. Data validation and normalization
 * 2. Transaction management
 * 3. Error handling
 * 4. Query parsing
 */
class BaseService {
  constructor(model = null, serviceName) {
    this.model = model;
    this.logger = logAction(serviceName || this.constructor.name);
    this.nullableFields = [];
    // Flag to enable/disable transactions
    this.useTransactions = false;
  }

  /**
   * Data Validation and Normalization Section
   */

  /**
   * Main validation pipeline for data processing
   * @param {Object} data - Input data to validate
   * @param {string} [id] - Document ID for update operations
   * @returns {Promise<Object>} Normalized and validated data
   */
  async validateAndNormalize(data, id = null) {
    try {
      // Step 1: Check duplicates if model exists
      if (this.model) {
        await this.checkDuplicates(data, id);
      }

      // Step 2: Normalize data fields
      const normalizedData = normalizeData(data, this.nullableFields);

      // Step 3: Custom validation
      await this.validateData(normalizedData, id);

      return normalizedData;
    } catch (error) {
      this.logger.error("Validation failed", error);
      throw error;
    }
  }

  /**
   * Check for duplicate entries - To be implemented by child services
   */
  async checkDuplicates(data, id = null) {
    // Override in child service
    return true;
  }

  /**
   * Custom validation logic - To be implemented by child services
   */
  async validateData(data, id = null) {
    // Override in child service
    return true;
  }

  /**
   * Transaction Management Section
   */

  /**
   * Initialize a database transaction
   * @returns {Promise<mongoose.ClientSession>}
   */
  async startTransaction() {
    if (!this.useTransactions || !this.model) {
      return null;
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    return session;
  }

  /**
   * Safely commit a transaction
   * @param {mongoose.ClientSession} session
   */
  async commitTransaction(session) {
    if (session) {
      await session.commitTransaction();
      session.endSession();
    }
  }

  /**
   * Handle transaction errors and rollback
   * @param {Error} error - Error object
   * @param {mongoose.ClientSession} session - Active session
   * @param {string} operation - Operation name for logging
   */
  async handleTransactionError(error, session, operation) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    this.logger.error(`${operation} failed`, error);
    throw error;
  }

  /**
   * Utility Functions Section
   */

  /**
   * Standard error handler for entity not found
   * @param {string} id - Entity ID
   * @param {string} [message] - Custom error message
   */
  handleNotFound(id, message) {
    const error = new Error(message || `${this.constructor.name} not found`);
    error.statusCode = 404;
    throw error;
  }

  /**
   * Parse and normalize query parameters
   * @param {Object} query - Raw query parameters
   * @returns {Object} Normalized query options
   */
  parseQueryOptions(query = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = "-createdAt",
      search,
      ...filters
    } = query;

    return {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortBy,
      search,
      filters,
    };
  }
}

module.exports = BaseService;
