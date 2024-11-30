// src/services/store.service.js
const Store = require("../models/Store");
const {
  createHistoryRecord,
  mergeHistory,
} = require("../utils/historyHandler");
const { logAction } = require("../utils/logger");

const storeLog = logAction("Store");

class StoreService {
  constructor() {
    this.model = Store;
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

      // Create if not exists
      if (!store) {
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
      });

      return updatedStore;
    } catch (error) {
      storeLog.error("Failed to update store information", error);
      throw error;
    }
  }
}

module.exports = new StoreService();
