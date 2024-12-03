const BaseService = require("./base.service");
const { logAction } = require("../utils/logger");
const banks = require("../data/banks");

class BankService extends BaseService {
  constructor() {
    super(null, "Bank"); // Không cần model vì đây là service xử lý static data
    this.logger = logAction("Bank");
  }

  /**
   * Lấy danh sách ngân hàng hỗ trợ VietQR
   * @param {boolean} onlySupported - Chỉ lấy ngân hàng hỗ trợ VietQR
   */
  getBanks(onlySupported = true) {
    try {
      let bankList = banks.data;
      if (onlySupported) {
        bankList = bankList.filter((b) => b.transferSupported);
      }

      const formattedBanks = bankList.map((bank) => ({
        id: bank.bin,
        code: bank.code,
        name: bank.name,
        shortName: bank.short_name,
        swiftCode: bank.swift_code,
        logo: bank.logo,
      }));

      return formattedBanks;
    } catch (error) {
      this.logger.error("Failed to get bank list", error);
      throw error;
    }
  }

  /**
   * Tìm thông tin ngân hàng theo BIN hoặc code
   */
  findBank(identifier) {
    try {
      const bank = banks.data.find(
        (b) =>
          b.bin === identifier ||
          b.code === identifier ||
          b.short_name === identifier
      );

      if (!bank) {
        throw new Error("Bank not found");
      }

      return bank;
    } catch (error) {
      this.logger.error("Failed to find bank", error);
      throw error;
    }
  }

  /**
   * validateBankInfo dùng để kiểm tra:
   * 1. Ngân hàng có tồn tại và hỗ trợ chuyển khoản
   * 2. Format số tài khoản đúng chuẩn
   * 3. Tên tài khoản hợp lệ
   */
  async validateBankInfo(bankInfo) {
    try {
      const bank = this.findBank(bankInfo.bankId);
      if (!bank) {
        throw new Error("Bank not found");
      }

      if (!bank.transferSupported) {
        throw new Error("Bank does not support transfers");
      }

      if (!bankInfo.accountNumber?.match(/^\d{8,19}$/)) {
        throw new Error("Invalid account number format");
      }

      if (!bankInfo.accountName?.trim()) {
        throw new Error("Account name is required");
      }

      return {
        bankId: bank.code,
        bin: bank.bin,
        shortName: bank.shortName,
        accountNumber: bankInfo.accountNumber,
        accountName: bankInfo.accountName.toUpperCase(),
        bankName: bank.name,
      };
    } catch (error) {
      this.logger.error("Bank validation failed", error);
      throw error;
    }
  }

  /**
   * Format thông tin ngân hàng cho VietQR
   */
  async formatBankInfoForQR(bankInfo) {
    try {
      // Validate trước khi format
      const validatedInfo = await this.validateBankInfo(bankInfo);

      return {
        bankId: validatedInfo.bankId,
        bin: validatedInfo.bin,
        accountNumber: validatedInfo.accountNumber,
        accountName: validatedInfo.accountName.toUpperCase(),
        template: validatedInfo.template || "compact2",
      };
    } catch (error) {
      this.logger.error("Failed to format bank info", error);
      throw error;
    }
  }
}

module.exports = BankService;
