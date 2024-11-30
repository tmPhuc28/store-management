// src/utils/bankValidator.js
const banksData = require("../data/banks");

exports.checkBankInfo = async (bankInfo) => {
  try {
    // Find bank in the list
    const bank = banksData.data.find(
      (b) =>
        b.bin === bankInfo.bin ||
        b.code === bankInfo.bankId ||
        b.short_name === bankInfo.shortName
    );

    if (!bank) {
      return {
        isValid: false,
        message: "Invalid bank information. Bank not found in VietQR system.",
      };
    }

    // Validate account number format
    if (!/^[0-9]{8,19}$/.test(bankInfo.accountNumber)) {
      return {
        isValid: false,
        message:
          "Invalid account number format. Must be 8-19 digits without spaces or special characters.",
      };
    }

    // Check if bank supports transfer
    if (!bank.transferSupported) {
      return {
        isValid: false,
        message: "Selected bank does not support VietQR transfers.",
      };
    }

    // Format and return validated bank info
    return {
      isValid: true,
      data: {
        bankId: bank.code,
        bin: bank.bin,
        shortName: bank.short_name,
        accountNumber: bankInfo.accountNumber,
        accountName: bankInfo.accountName.toUpperCase(),
        template: bankInfo.template || "compact2",
        swiftCode: bank.swift_code,
      },
    };
  } catch (error) {
    throw new Error("Bank validation failed: " + error.message);
  }
};

exports.isSupportedBank = (bankId) => {
  const bank = banksData.data.find(
    (b) => b.bin === bankId || b.code === bankId || b.short_name === bankId
  );
  return bank && bank.transferSupported;
};

exports.getBankList = (onlySupported = true) => {
  let banks = banksData.data;
  if (onlySupported) {
    banks = banks.filter((b) => b.transferSupported);
  }
  return banks.map((b) => ({
    id: b.code,
    bin: b.bin,
    name: b.name,
    shortName: b.short_name,
    logo: b.logo,
  }));
};
