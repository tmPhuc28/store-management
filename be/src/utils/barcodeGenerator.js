// src/utils/barcodeGenerator.js
const bwipjs = require("bwip-js");

const generateBarcode = async (text) => {
  try {
    const png = await bwipjs.toBuffer({
      bcid: "code128", // Barcode type
      text: text, // Text to encode
      scale: 3, // 3x scaling factor
      height: 10, // Bar height, in millimeters
      includetext: true, // Show human-readable text
      textxalign: "center", // Always good to set this
    });

    return `data:image/png;base64,${png.toString("base64")}`;
  } catch (error) {
    console.error("Error generating barcode:", error);
    return null;
  }
};

module.exports = generateBarcode;
