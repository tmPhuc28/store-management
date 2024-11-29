// src/services/store.service.js
const Store = require("../models/Store");
const {
  createHistoryRecord,
  mergeHistory,
} = require("../utils/historyHandler");
const { logAction } = require("../utils/logger");
const QRCode = require("qrcode");

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

        // Generate QR code for store payments
        if (data.bankAccount) {
          const qrCode = await this.generatePaymentQR({
            bankAccount: data.bankAccount,
            bankName: data.bankName,
            accountName: data.accountName,
          });
          store.paymentQR = qrCode;
          await store.save();
        }

        storeLog.success("Created store information", {
          userId: user._id,
          storeData: data,
        });

        return store;
      }

      // Update existing store
      const historyRecord = createHistoryRecord(user, data, "update");
      const updateHistory = mergeHistory(store.updateHistory, historyRecord);

      // Generate new QR if bank details changed
      let paymentQR = store.paymentQR;
      if (
        data.bankAccount &&
        (data.bankAccount !== store.bankAccount ||
          data.bankName !== store.bankName ||
          data.accountName !== store.accountName)
      ) {
        paymentQR = await this.generatePaymentQR({
          bankAccount: data.bankAccount,
          bankName: data.bankName,
          accountName: data.accountName,
        });
      }

      const updatedStore = await this.model.findOneAndUpdate(
        {},
        {
          ...data,
          paymentQR,
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

  // Helper methods
  async generatePaymentQR(data) {
    try {
      return await QRCode.toDataURL(JSON.stringify(data));
    } catch (error) {
      storeLog.error("Failed to generate QR code", error);
      return null;
    }
  }
}

module.exports = new StoreService();
