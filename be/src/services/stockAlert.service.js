// src/services/stockAlert.service.js
const Product = require("../models/Product");
const { logAction } = require("../utils/logger");
const alertLog = logAction("StockAlert");

class StockAlertService {
  constructor(io) {
    this.io = io;
    this.alertCache = new Map();
  }

  async checkAndNotify(product) {
    try {
      const alert = product.updateStockStatus();

      if (alert) {
        // Cập nhật cache và gửi thông báo
        this.alertCache.set(product._id.toString(), alert);

        // Gửi thông báo qua Socket.IO
        this.io.emit("stockAlert", alert);

        // Log cảnh báo
        alertLog.success("Stock alert sent", {
          productId: product._id,
          alert,
        });

        // Cập nhật thời gian thông báo cuối cùng
        await Product.findByIdAndUpdate(product._id, {
          "stockAlert.lastNotified": new Date(),
        });
      } else {
        // Xóa khỏi cache nếu không còn cảnh báo
        this.alertCache.delete(product._id.toString());
      }

      return alert;
    } catch (error) {
      alertLog.error("Failed to process stock alert", error);
      throw error;
    }
  }

  async getActiveAlerts() {
    try {
      const products = await Product.find({
        "stockAlert.enabled": true,
        "stockAlert.status": { $in: ["warning", "critical"] },
      });

      const alerts = [];
      for (const product of products) {
        const alert = product.updateStockStatus();
        if (alert) {
          alerts.push(alert);
        }
      }

      return alerts;
    } catch (error) {
      alertLog.error("Failed to get active alerts", error);
      throw error;
    }
  }

  // Kiểm tra tồn kho khi cập nhật số lượng
  async checkStockOnUpdate(productId, newQuantity) {
    try {
      const product = await Product.findById(productId);
      if (!product) return;

      product.quantity = newQuantity;
      return await this.checkAndNotify(product);
    } catch (error) {
      alertLog.error("Failed to check stock on update", error);
      throw error;
    }
  }
}

module.exports = StockAlertService;
