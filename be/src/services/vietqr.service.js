const BaseService = require("./base.service");
const BankService = require("./bank.service");
const { logAction } = require("../utils/logger");

class VietQRService extends BaseService {
  constructor() {
    super(null, "VietQR");
    this.bankService = new BankService();
    this.logger = logAction("VietQR");
    this.baseUrl = "https://img.vietqr.io/image";
  }

  /**
   * Tạo VietQR URL
   */
  async generateQRUrl(data) {
    try {
      const { bankInfo, amount, description, template = "compact2" } = data;

      // Format bank info
      const formattedBank = await this.bankService.formatBankInfoForQR(
        bankInfo
      );

      // Build URL
      let url = `${this.baseUrl}/${formattedBank.bankId}-${formattedBank.accountNumber}-${template}.png`;

      // Add params
      const params = [];
      if (amount) params.push(`amount=${amount}`);
      if (description)
        params.push(`addInfo=${encodeURIComponent(description)}`);
      if (formattedBank.accountName) {
        params.push(
          `accountName=${encodeURIComponent(formattedBank.accountName)}`
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

  /**
   * Parse VietQR data từ URL
   */
  parseQRUrl(url) {
    try {
      const parsedUrl = new URL(url);
      const [bankId, accountNumber, template] = parsedUrl.pathname
        .split("/")
        .pop()
        .split(".")[0]
        .split("-");

      const params = Object.fromEntries(parsedUrl.searchParams);

      return {
        bankId,
        accountNumber,
        template,
        amount: params.amount ? Number(params.amount) : null,
        description: params.addInfo ? decodeURIComponent(params.addInfo) : null,
        accountName: params.accountName
          ? decodeURIComponent(params.accountName)
          : null,
      };
    } catch (error) {
      this.logger.error("Failed to parse VietQR URL", error);
      throw error;
    }
  }

  /**
   * Validate VietQR URL
   */
  async validateQRUrl(url) {
    try {
      const parsedData = this.parseQRUrl(url);

      // Validate bank info
      await this.bankService.validateBankInfo({
        bankId: parsedData.bankId,
        accountNumber: parsedData.accountNumber,
      });

      return true;
    } catch (error) {
      this.logger.error("VietQR URL validation failed", error);
      return false;
    }
  }

  /**
   * Generate QR code cho invoice
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
}

module.exports = VietQRService;
