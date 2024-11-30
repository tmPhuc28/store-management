// src/services/store.service.js
const Store = require("../models/Store");
const {
  createHistoryRecord,
  mergeHistory,
} = require("../utils/historyHandler");
const { logAction } = require("../utils/logger");
const { checkBankInfo } = require("../utils/bankValidator");
const storeLog = logAction("Store");

class StoreService {
  constructor() {
    this.model = Store;
  }

  async validateAndFormatBankInfo(bankInfo) {
    try {
      const validatedInfo = await checkBankInfo(bankInfo);
      if (!validatedInfo.isValid) {
        throw new Error(validatedInfo.message);
      }
      return validatedInfo.data;
    } catch (error) {
      storeLog.error("Bank information validation failed", error);
      throw error;
    }
  }

  async getStoreInfo() {
    try {
      const store = await this.model.findOne();
      if (!store) {
        throw new Error("Store information not found");
      }

      return store;
    } catch (error) {
      storeLog.error("Failed to retrieve store information", error);
      throw error;
    }
  }

  async updateStore(data, user) {
    try {
      let store = await this.model.findOne();

      // Validate bank information if provided
      if (data.bankInfo) {
        data.bankInfo = await this.validateAndFormatBankInfo(data.bankInfo);
      }

      // Create if not exists
      if (!store) {
        if (!data.bankInfo) {
          throw new Error("Bank information is required for store creation");
        }

        store = await this.model.create({
          ...data,
          updateHistory: [createHistoryRecord(user, data, "create")],
        });

        storeLog.success("Created store information", {
          userId: user._id,
          storeData: data,
        });

        return store;
      }

      // Update existing store
      const historyRecord = createHistoryRecord(user, data, "update");
      const updateHistory = mergeHistory(store.updateHistory, historyRecord);

      // Generate VietQR if bank info is updated
      const bankInfoChanged =
        data.bankInfo &&
        (data.bankInfo.accountNumber !== store.bankInfo?.accountNumber ||
          data.bankInfo.bankId !== store.bankInfo?.bankId);

      const updatedStore = await this.model.findOneAndUpdate(
        {},
        {
          ...data,
          updateHistory,
        },
        { new: true }
      );

      storeLog.success("Updated store information", {
        userId: user._id,
        changes: data,
        bankInfoChanged,
      });

      return updatedStore;
    } catch (error) {
      storeLog.error("Failed to update store information", error);
      throw error;
    }
  }

  // Helper method to generate VietQR URL
  async generateVietQRUrl(amount, description) {
    try {
      const store = await this.getStoreInfo();
      return store.generateVietQRUrl(amount, description);
    } catch (error) {
      storeLog.error("Failed to generate VietQR URL", error);
      throw error;
    }
  }
}

module.exports = new StoreService();
