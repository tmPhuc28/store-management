// src/services/payment.service.js
const BaseService = require("./base/base.service");
const banks = require("../data/banks");

class PaymentService extends BaseService {
  constructor() {
    super(null, "Payment"); // Không cần model vì xử lý static data
    this.baseQrUrl = "https://img.vietqr.io/image";
  }

  /**
   * Bank Management Methods
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

      this.logger.success("Retrieved bank list", {
        count: formattedBanks.length,
        onlySupported,
      });

      return formattedBanks;
    } catch (error) {
      this.logger.error("Failed to get bank list", error);
      throw error;
    }
  }

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

      this.logger.success("Found bank", { identifier });
      return bank;
    } catch (error) {
      this.logger.error("Failed to find bank", error);
      throw error;
    }
  }

  async validateBankInfo(bankInfo) {
    try {
      const bank = this.findBank(bankInfo.bankId);

      if (!bank) {
        throw new Error("Bank not found");
      }

      if (!bank.transferSupported) {
        throw new Error("Bank does not support transfers");
      }

      // Validate account number format
      if (!bankInfo.accountNumber?.match(/^\d{8,19}$/)) {
        throw new Error("Invalid account number format");
      }

      if (!bankInfo.accountName?.trim()) {
        throw new Error("Account name is required");
      }

      const validatedInfo = {
        bankId: bank.code,
        bin: bank.bin,
        shortName: bank.shortName,
        accountNumber: bankInfo.accountNumber,
        accountName: bankInfo.accountName.toUpperCase(),
        bankName: bank.name,
      };

      this.logger.success("Validated bank info", { bankInfo: validatedInfo });
      return validatedInfo;
    } catch (error) {
      this.logger.error("Bank validation failed", error);
      throw error;
    }
  }

  /**
   * VietQR Methods
   */
  async generateQRUrl(data) {
    try {
      const { bankInfo, amount, description, template = "compact2" } = data;

      // Validate and format bank info
      const validatedBank = await this.validateBankInfo(bankInfo);

      // Build URL
      let url = `${this.baseQrUrl}/${validatedBank.bin}-${validatedBank.accountNumber}-${template}.png`;

      // Add params
      const params = [];
      if (amount) params.push(`amount=${amount}`);
      if (description)
        params.push(`addInfo=${encodeURIComponent(description)}`);
      if (validatedBank.accountName) {
        params.push(
          `accountName=${encodeURIComponent(validatedBank.accountName)}`
        );
      }

      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      this.logger.success("Generated VietQR URL");
      return url;
    } catch (error) {
      this.logger.error("Failed to generate VietQR URL", error);
      throw error;
    }
  }

  parseQRUrl(url) {
    try {
      const parsedUrl = new URL(url);
      const [bankId, accountNumber, template] = parsedUrl.pathname
        .split("/")
        .pop()
        .split(".")[0]
        .split("-");

      const params = Object.fromEntries(parsedUrl.searchParams);

      const parsedData = {
        bankId,
        accountNumber,
        template,
        amount: params.amount ? Number(params.amount) : null,
        description: params.addInfo ? decodeURIComponent(params.addInfo) : null,
        accountName: params.accountName
          ? decodeURIComponent(params.accountName)
          : null,
      };

      this.logger.success("Parsed QR URL", { parsedData });
      return parsedData;
    } catch (error) {
      this.logger.error("Failed to parse QR URL", error);
      throw error;
    }
  }

  async validateQRUrl(url) {
    try {
      const parsedData = this.parseQRUrl(url);

      // Validate bank info
      await this.validateBankInfo({
        bankId: parsedData.bankId,
        accountNumber: parsedData.accountNumber,
      });

      return true;
    } catch (error) {
      this.logger.error("QR URL validation failed", error);
      return false;
    }
  }

  /**
   * Invoice Payment Methods
   */
  async generateInvoiceQR(invoice, bankInfo) {
    try {
      if (!invoice.total) {
        throw new Error("Invoice total is required");
      }

      return await this.generateQRUrl({
        bankInfo,
        amount: invoice.total,
        description: `Payment for ${invoice.invoiceNumber}`,
        template: "compact2",
      });
    } catch (error) {
      this.logger.error("Failed to generate invoice QR", error);
      throw error;
    }
  }

  /**
   * Helper Methods
   */
  getSearchFields() {
    return ["name", "code", "shortName"];
  }

  async validateUnique() {
    return true; // Not applicable for this service
  }
}

module.exports = new PaymentService();
