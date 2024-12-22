const bwipjs = require("bwip-js");

const generateBarcode = async (text, options = {}) => {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Invalid input: text must be a non-empty string");
  }

  const {
    bcid = "code128",
    scale = 3,
    height = 15,
    includetext = true,
  } = options;

  try {
    const png = await bwipjs.toBuffer({
      bcid,
      text,
      scale,
      height,
      includetext,
      textxalign: "center",
    });

    return `data:image/png;base64,${png.toString("base64")}`;
  } catch (error) {
    console.error("Error generating barcode:", { error, text, options });
    throw new Error("Failed to generate barcode");
  }
};

module.exports = generateBarcode;
