const mongoose = require("mongoose");
const { logAction } = require("../../utils/logger");
const { processData, processResponse } = require("../../utils/dataProcessor");
const { checkDuplicate } = require("../../utils/duplicateCheck");
const {
  createHistoryRecord,
  mergeHistory,
} = require("../../utils/historyHandler");
const { validateStatusChange } = require("../../utils/statusValidator");
const QueryBuilder = require("../../utils/queryBuilder");
class BaseService {
  constructor(model, serviceName) {
    this.model = model;
    this.serviceName = serviceName;
    this.logger = logAction(serviceName);
    this.queryBuilder = new QueryBuilder(this.getSearchFields());
    this.useHistory = false;
    this.useTransactions = false;

    this.nullableFields = [];
    this.allowedFields = [];
    this.protectedFields = [
      "createdAt",
      "updatedAt",
      "createdBy",
      "updateHistory",
      "__v",
      "_id",
      "id",
    ];

    this.excludeFields = [
      "__v",
      "_id",
      "createdAt",
      "updatedAt",
      "updateHistory",
    ];
  }

  /**
   * Enhanced findById method without history
   */
  async findById(id, options = {}) {
    try {
      const { populate = this.getPopulateConfig("detail") } = options;

      const query = this.model.findById(id);

      if (populate) {
        query.populate(populate);
      }

      const document = await query;

      if (!document) {
        throw new Error(`${this.serviceName} not found`);
      }

      return this.processResponse(document);
    } catch (error) {
      this.logger.error(`Failed to get ${this.serviceName} by id`, error);
      throw error;
    }
  }

  /**
   * Enhanced find method with improved search and filters
   */
  async find(params = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = "-createdAt",
        search,
        populate = this.getPopulateConfig("list"),
      } = options;

      let queryObj = {};

      if (search && search.trim()) {
        const searchFields = this.getSearchFields();
        if (searchFields.length > 0) {
          queryObj.$or = searchFields.map((field) => ({
            [field]: { $regex: search.trim(), $options: "i" },
          }));
        }
      }

      const customQuery = this.buildCustomQuery(params);
      queryObj = { ...queryObj, ...customQuery };

      const startIndex = (parseInt(page) - 1) * parseInt(limit);

      const [total, data] = await Promise.all([
        this.model.countDocuments(queryObj),
        this.model
          .find(queryObj)
          .populate(populate)
          .sort(sort)
          .skip(startIndex)
          .limit(parseInt(limit)),
      ]);

      return {
        data: this.processResponse(data),
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch ${this.serviceName}s`, error);
      throw error;
    }
  }

  /**
   * Get history for an entity
   */
  async getHistory(id, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = "-timestamp",
        populate = this.getPopulateConfig("select"),
      } = options;

      const startIndex = (parseInt(page) - 1) * parseInt(limit);

      const document = await this.model
        .findById(id)
        .select("updateHistory")
        .populate(populate);

      if (!document) {
        throw new Error(`${this.serviceName} not found`);
      }

      const history = document.updateHistory || [];
      const total = history.length;

      // Sort history
      if (sort.startsWith("-")) {
        history.sort((a, b) => b[sort.substring(1)] - a[sort.substring(1)]);
      } else {
        history.sort((a, b) => a[sort] - b[sort]);
      }

      // Apply pagination
      const paginatedHistory = history.slice(
        startIndex,
        startIndex + parseInt(limit)
      );

      return {
        data: paginatedHistory,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to get ${this.serviceName} history`, error);
      throw error;
    }
  }

  /**
   * Delete history entry by ID
   */
  async deleteHistoryEntry(entityId, historyId, user) {
    const session = await this.startTransaction();

    try {
      // Validate entity exists and user has permission
      const entity = await this.model.findById(entityId);
      if (!entity) {
        throw new Error(`${this.serviceName} not found`);
      }

      // Check if history entry exists
      const historyEntry = entity.updateHistory?.id(historyId);
      if (!historyEntry) {
        throw new Error("History entry not found");
      }

      // Remove history entry
      entity.updateHistory.pull(historyId);

      // Add record about history deletion
      const historyRecord = createHistoryRecord(
        user,
        { deletedHistoryId: historyId },
        "history_delete"
      );
      entity.updateHistory.push(historyRecord);

      await entity.save({ session });
      await this.endTransaction(session, true);

      this.logger.success(`Deleted history entry`, {
        entityId,
        historyId,
        userId: user?._id,
      });

      return entity.updateHistory;
    } catch (error) {
      await this.endTransaction(session, false);
      this.logger.error(`Error deleting history entry`, error);
      throw error;
    }
  }

  /**
   * Clear all history
   */
  async clearHistory(entityId, user) {
    const session = await this.startTransaction();

    try {
      const entity = await this.model.findById(entityId);
      if (!entity) {
        throw new Error(`${this.serviceName} not found`);
      }

      // Store history count for logging
      const historyCount = entity.updateHistory?.length || 0;

      // Clear history array
      entity.updateHistory = [
        createHistoryRecord(
          user,
          { clearedEntriesCount: historyCount },
          "history_clear"
        ),
      ];

      await entity.save({ session });
      await this.endTransaction(session, true);

      this.logger.success(`Cleared all history`, {
        entityId,
        userId: user?._id,
        entriesCleared: historyCount,
      });

      return entity.updateHistory;
    } catch (error) {
      await this.endTransaction(session, false);
      this.logger.error(`Error clearing history`, error);
      throw error;
    }
  }

  /**
   * Create data for an entity
   */
  async create(data, user = null, options = {}) {
    const session = await this.startTransaction(options);

    try {
      const processedData = processData(data, {
        nullableFields: this.nullableFields,
        protectedFields: this.protectedFields,
        allowedFields: this.allowedFields,
      });

      // Check if there's any data left after processing
      if (Object.keys(processedData).length === 0) {
        throw new Error(
          "No valid data provided after filtering protected fields"
        );
      }

      await this.validateUnique(processedData);

      if (user) {
        processedData.createdBy = user._id;
      }

      if (this.useHistory && user) {
        const historyRecord = createHistoryRecord(
          user,
          processedData,
          "create"
        );
        processedData.updateHistory = [historyRecord];
      }

      const document = await this.model.create([processedData], { session });
      await this.endTransaction(session, true);

      return this.processResponse(document[0]);
    } catch (error) {
      await this.endTransaction(session, false);
      throw error;
    }
  }

  /**
   * Update data for an entity
   */
  async update(id, data, user = null, options = {}) {
    const session = await this.startTransaction(options);

    try {
      const processedData = processData(data, {
        nullableFields: this.nullableFields,
        protectedFields: this.protectedFields,
        allowedFields: this.allowedFields,
      });
      // Check if there's any data left after processing
      if (Object.keys(processedData).length === 0) {
        throw new Error(
          "No valid data provided after filtering protected fields"
        );
      }

      await this.validateUnique(processedData, id);

      const document = await this.getFullDocument(id);

      if (this.useHistory && user) {
        const historyRecord = createHistoryRecord(
          user,
          processedData,
          "update"
        );
        processedData.updateHistory = mergeHistory(
          document.updateHistory,
          historyRecord
        );
      }

      const updated = await this.model.findByIdAndUpdate(
        id,
        { $set: processedData },
        {
          new: true,
          runValidators: true,
          session,
        }
      );

      await this.endTransaction(session, true);

      return this.processResponse(updated);
    } catch (error) {
      await this.endTransaction(session, false);
      throw error;
    }
  }

  /**
   * Update status data for an entity
   */
  async updateStatus(id, status, user, options = {}) {
    const session = await this.startTransaction(options);

    try {
      const document = await this.getFullDocument(id);
      const validation = await this.validateStatusChange(document, status);
      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      const historyRecord = createHistoryRecord(
        user,
        { status },
        "status_update"
      );
      const updateHistory = mergeHistory(document.updateHistory, historyRecord);

      const updateData = {
        status,
        updateHistory,
      };

      const updated = await this.model.findByIdAndUpdate(
        id,
        { $set: updateData },
        {
          new: true,
          runValidators: true,
          session,
        }
      );

      await this.endTransaction(session, true);

      return this.processResponse(updated);
    } catch (error) {
      await this.endTransaction(session, false);
      throw error;
    }
  }

  /**
   * Delete data for an entity
   */
  async delete(id, user = null, options = {}) {
    const session = await this.startTransaction(options);

    try {
      const document = await this.getFullDocument(id);
      await this.validateDelete(document, user);

      await document.deleteOne({ session });
      await this.endTransaction(session, true);

      this.logger.success(`Deleted ${this.serviceName}`, {
        id,
        user: user?._id,
      });

      return { message: `${this.serviceName} deleted successfully` };
    } catch (error) {
      await this.endTransaction(session, false);
      throw error;
    }
  }

  /**
   * Transaction Helpers
   */
  async startTransaction(options = {}) {
    if (!this.useTransactions || options.session) {
      return options.session || null;
    }

    try {
      const session = await mongoose.startSession();
      session.startTransaction();
      return session;
    } catch (error) {
      this.logger.error("Failed to start transaction", error);
      return null;
    }
  }

  async endTransaction(session, isSuccess) {
    if (!session || session.hasEnded) return; // Không làm gì nếu session đã kết thúc

    try {
      if (isSuccess) {
        await session.commitTransaction();
      } else {
        await session.abortTransaction();
      }
    } catch (err) {
      this.logger.error("Transaction commit/abort failed", err);
    } finally {
      try {
        await session.endSession();
      } catch (error) {
        this.logger.error("Failed to end session", error);
      }
    }
  }

  /**
   * Validation Methods
   */
  async validateUnique(data, excludeId = null) {
    const checkFields = [];
    //Check for duplicates...
    await Promise.all(checkFields);
  }

  /**
   * Validation Methods
   */
  async validateDelete(document, requestUser) {
    return true;
  }

  /**
   * validateStatusChange - to be overridden by child classes
   */
  async validateStatusChange(document, status) {
    return await validateStatusChange(document, status);
  }

  /**
   * Get searchable fields - to be overridden by child classes
   */
  getSearchFields() {
    return ["name", "description"];
  }

  /**
   * Build custom query - to be overridden by child classes
   */
  buildCustomQuery(params) {
    return {};
  }

  /**
   * Get populate configuration based on view type
   * @param {string} view - 'list' or 'detail'
   */
  getPopulateConfig(view = "list") {
    return [];
  }

  /**
   * Process response to exclude unnecessary fields
   */
  processResponse(document) {
    return processResponse(document, this.excludeFields);
  }

  /**
   *  Check for duplicate entries
   * */
  checkDuplicate(conditions, excludeId = null, message = null) {
    return checkDuplicate(this.model, conditions, excludeId, message);
  }

  /**
   * Get document with all fields for internal operations
   */
  async getFullDocument(id) {
    const document = await this.model.findById(id);
    if (!document) {
      throw new Error(`${this.serviceName} not found`);
    }
    return document;
  }
}

module.exports = BaseService;
