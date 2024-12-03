const BaseService = require("./base.service");
const BankService = require("./bank.service");
const Store = require("../models/Store");
const {
  createHistoryRecord,
  mergeHistory,
} = require("../utils/historyHandler");

class StoreService extends BaseService {
  constructor() {
    super(Store, "Store");
    this.nullableFields = [
      "email",
      "taxCode",
      "address.ward",
      "address.district",
      "address.province",
    ];
    this.bankService = new BankService();
  }

  /**
   * Get store information
   */
  async getStoreInfo() {
    try {
      const store = await this.model
        .findOne()
        .populate("updateHistory.updatedBy", "username email");

      if (!store) {
        throw new Error("Store information not found");
      }

      return store;
    } catch (error) {
      this.logger.error("Failed to retrieve store information", error);
      throw error;
    }
  }

  /**
   * Get store bank information
   */
  async getStoreBankInfo() {
    try {
      const store = await this.getStoreInfo();

      if (!store.bankInfo) {
        throw new Error("Store bank information not configured");
      }

      return store.bankInfo;
    } catch (error) {
      this.logger.error("Failed to get store bank information", error);
      throw error;
    }
  }

  /**
   * Create or Update store information
   */
  async updateStore(data, user) {
    try {
      if (data.bankInfo) {
        // Validate bank info trước khi lưu
        const validatedBankInfo = await this.bankService.validateBankInfo(
          data.bankInfo
        );
        data.bankInfo = validatedBankInfo;
      }

      const normalizedData = await this.validateAndNormalize(data);

      let store = await this.model.findOne();
      let isNew = !store;

      const historyRecord = createHistoryRecord(
        user,
        normalizedData,
        isNew ? "create" : "update"
      );

      const updateHistory = isNew
        ? [historyRecord]
        : mergeHistory(store.updateHistory, historyRecord);

      const updatedStore = await this.model.findOneAndUpdate(
        {},
        {
          ...normalizedData,
          updateHistory,
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        }
      );

      return updatedStore;
    } catch (error) {
      this.logger.error("Failed to update store", error);
      throw error;
    }
  }

  /**
   * Update bank information for store
   */
  async updateBankInfo(bankInfo, user) {
    try {
      const validatedBankInfo = await this.bankService.validateBankInfo(
        bankInfo
      );

      const store = await this.model.findOne();
      if (!store) {
        throw new Error("Store not found");
      }

      const historyRecord = createHistoryRecord(
        user,
        { bankInfo: validatedBankInfo },
        "update_bank_info"
      );
      const updateHistory = mergeHistory(store.updateHistory, historyRecord);

      const updatedStore = await this.model.findOneAndUpdate(
        {},
        {
          bankInfo: validatedBankInfo,
          updateHistory,
        },
        { new: true }
      );

      return updatedStore;
    } catch (error) {
      this.logger.error("Failed to update bank info", error);
      throw error;
    }
  }
}

module.exports = StoreService;
