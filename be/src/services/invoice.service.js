// src/services/invoice.service.js
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const discountService = require("./discount.service");
const QRCode = require("qrcode");

class InvoiceService {
  async calculateInvoiceItems(items) {
    const calculatedItems = [];
    let subTotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Sản phẩm không tồn tại: ${item.product}`);
      }

      if (product.status !== 1) {
        throw new Error(`Sản phẩm không khả dụng: ${product.name}`);
      }

      if (item.quantity > product.quantity) {
        throw new Error(`Số lượng không đủ cho sản phẩm: ${product.name}`);
      }

      const discountInfo = await discountService.checkProductDiscount(product);
      const itemSubTotal = discountInfo.finalPrice * item.quantity;

      calculatedItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        discount: discountInfo.hasDiscount ? discountInfo.percentage : 0,
        finalPrice: discountInfo.finalPrice,
        subTotal: itemSubTotal,
      });

      subTotal += itemSubTotal;
    }

    return {
      items: calculatedItems,
      subTotal,
    };
  }

  async generateQRCode(invoiceData) {
    try {
      const qrData = JSON.stringify({
        invoiceNumber: invoiceData.invoiceNumber,
        amount: invoiceData.total,
        date: new Date(),
        paymentMethod: invoiceData.paymentMethod,
      });

      return await QRCode.toDataURL(qrData);
    } catch (error) {
      console.error("Error generating QR code:", error);
      return null;
    }
  }

  async updateProductQuantities(items) {
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: -item.quantity },
      });
    }
  }

  async updateCustomerPurchaseHistory(customerId, invoiceId) {
    await Customer.findByIdAndUpdate(customerId, {
      $push: { purchaseHistory: invoiceId },
      $inc: { totalPurchases: 1 },
      lastPurchaseDate: new Date(),
    });
  }
}

module.exports = new InvoiceService();
