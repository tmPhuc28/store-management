// src/services/store.service.js
const BaseService = require("./base/base.service");
const Store = require("../models/Store");
const PaymentService = require("./payment.service");

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
    this.useHistory = true;
    this.useTransactions = true;
    this.excludeFields = [...this.excludeFields];
    this.paymentService = PaymentService;
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

      // Get bank name if bank info exists
      if (store.bankInfo?.bankId) {
        try {
          const bankDetails = await this.paymentService.findBank(
            store.bankInfo.bankId
          );
          store.bankInfo.bankName = bankDetails.name;
        } catch (error) {
          this.logger.error("Failed to get bank details", error);
          // Don't throw error as this is not critical
        }
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
    let session = null;
    try {
      session = await this.startTransaction();

      if (data.bankInfo) {
        const validatedBankInfo = await this.paymentService.validateBankInfo(
          data.bankInfo
        );
        data.bankInfo = validatedBankInfo;
      }

      let store = await this.model.findOne();
      const isNew = !store;

      if (isNew) {
        const createData = {
          ...data,
          updateHistory: [
            {
              action: "create",
              updatedBy: user._id,
              changes: {
                ...data,
                bankInfo: data.bankInfo ? "[secured]" : undefined,
              },
            },
          ],
        };

        const result = await this.model.create([createData], { session });
        store = result[0];
      } else {
        const historyRecord = {
          action: "update",
          updatedBy: user._id,
          changes: {
            ...data,
            bankInfo: data.bankInfo ? "[secured]" : undefined,
          },
        };

        store = await this.model.findByIdAndUpdate(
          store._id,
          {
            ...data,
            $push: { updateHistory: historyRecord },
          },
          { new: true, session }
        );
      }

      await this.endTransaction(session, true);

      this.logger.success(
        `${isNew ? "Created" : "Updated"} store information`,
        {
          storeId: store._id,
          userId: user._id,
        }
      );

      return store;
    } catch (error) {
      await this.endTransaction(session, false);
      this.logger.error("Failed to update store", error);
      throw error;
    }
  }

  /**
   * Update bank information
   */
  async updateBankInfo(bankInfo, user) {
    try {
      const validatedBankInfo = await this.paymentService.validateBankInfo(
        bankInfo
      );
      const store = await this.getStoreInfo();

      const updatedStore = await this.update(
        store._id,
        { bankInfo: validatedBankInfo },
        user
      );

      // Generate new QR code for store
      try {
        const qrUrl = await this.paymentService.generateQRUrl({
          bankInfo: validatedBankInfo,
          template: "compact2",
        });
        updatedStore.bankInfo.qrCode = qrUrl;
        await updatedStore.save();
      } catch (error) {
        this.logger.error("Failed to generate QR code", error);
        // Don't throw error as this is not critical
      }

      this.logger.success("Updated bank information", {
        storeId: store._id,
        userId: user._id,
      });

      return updatedStore.bankInfo;
    } catch (error) {
      this.logger.error("Failed to update bank info", error);
      throw error;
    }
  }

  /**
   * Override base methods
   */
  getSearchFields() {
    return ["name", "phone", "email", "taxCode"];
  }

  async validateUnique(data, excludeId = null) {
    // Store is singleton, no need to check uniqueness
    return true;
  }
}

module.exports = new StoreService();
