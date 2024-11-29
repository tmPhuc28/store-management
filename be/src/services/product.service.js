// src/services/product.service.js
const Product = require("../models/Product");
const Category = require("../models/Category");
const normalizeData = require("../utils/normalizeData");
const { checkDuplicate } = require("../utils/duplicateCheck");
const {
  createHistoryRecord,
  mergeHistory,
} = require("../utils/historyHandler");
const { logAction } = require("../utils/logger");
const { validateGeneralStatusChange } = require("../utils/statusValidator");
const generateQRCode = require("qrcode");
const generateBarcode = require("../utils/barcodeGenerator");

const productLog = logAction("Product");

class ProductService {
  constructor() {
    this.nullableFields = [
      "description",
      "manufacturer",
      "supplier",
      "variants",
      "images",
    ];
    this.model = Product;
  }

  async getProducts(query = {}, user) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        category,
        status,
        sortBy = "-createdAt",
      } = query;

      const startIndex = (page - 1) * limit;
      let queryObj = {};

      // Build search query
      if (search) {
        queryObj.$or = [
          { name: { $regex: search, $options: "i" } },
          { sku: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      // Category filter with subcategories support
      if (category) {
        const categoryDoc = await Category.findById(category);
        if (categoryDoc) {
          queryObj.categoryPath = categoryDoc._id;
        }
      }

      if (status !== undefined) {
        queryObj.status = parseInt(status);
      }

      const [total, products] = await Promise.all([
        this.model.countDocuments(queryObj),
        this.model
          .find(queryObj)
          .populate("category", "name")
          .populate("categoryPath", "name")
          .sort(sortBy)
          .skip(startIndex)
          .limit(parseInt(limit)),
      ]);

      productLog.success("Retrieved products list", {
        userId: user?._id,
        query: queryObj,
      });

      return {
        count: products.length,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        data: products,
      };
    } catch (error) {
      productLog.error("Failed to retrieve products", error);
      throw error;
    }
  }

  async validateProduct(data, productId = null) {
    // Check for duplicate SKU
    if (data.sku) {
      await checkDuplicate(
        this.model,
        { sku: data.sku },
        productId,
        "SKU already exists"
      );
    }

    // Validate category
    if (data.category) {
      const category = await Category.findById(data.category);
      if (!category) {
        throw new Error("Category not found");
      }

      if (!category.status) {
        throw new Error("Category is inactive");
      }

      // Check if category is a leaf node
      const hasChildren = await Category.findOne({
        parentCategory: data.category,
      });
      if (hasChildren) {
        throw new Error("Products can only be assigned to leaf categories");
      }
    }

    // Price validation
    if (data.price !== undefined && data.price < 0) {
      throw new Error("Price cannot be negative");
    }

    // Quantity validation
    if (data.quantity !== undefined && data.quantity < 0) {
      throw new Error("Quantity cannot be negative");
    }

    return normalizeData(data, this.nullableFields);
  }

  async create(data, user) {
    try {
      const normalizedData = await this.validateProduct(data);

      // Generate codes
      const [barcode, qrCode] = await Promise.all([
        generateBarcode(data.sku),
        generateQRCode.toDataURL(
          JSON.stringify({
            sku: data.sku,
            name: data.name,
            price: data.price,
            category: data.category,
          })
        ),
      ]);

      // Build category path
      const categoryPath = await this.buildCategoryPath(data.category);

      const productData = {
        ...normalizedData,
        barcode,
        qrCode,
        categoryPath,
        status: data.status !== undefined ? parseInt(data.status) : 1,
        finalPrice: data.price, // Initial price without discount
        updateHistory: [createHistoryRecord(user, normalizedData, "create")],
      };

      const product = await this.model.create(productData);

      productLog.success("Created product", {
        productId: product._id,
        userId: user._id,
        sku: product.sku,
      });

      return product;
    } catch (error) {
      productLog.error("Failed to create product", error);
      throw error;
    }
  }

  async update(id, data, user) {
    try {
      const product = await this.getProductById(id, user);
      const normalizedData = await this.validateProduct(data, id);

      // Handle category change
      if (data.category && data.category !== product.category.toString()) {
        normalizedData.categoryPath = await this.buildCategoryPath(
          data.category
        );
      }

      // Create history record
      const historyRecord = createHistoryRecord(user, normalizedData, "update");
      const updateHistory = mergeHistory(product.updateHistory, historyRecord);

      // Update product
      const updatedProduct = await this.model.findByIdAndUpdate(
        id,
        {
          ...normalizedData,
          finalPrice: this.calculateFinalPrice(
            data.price || product.price,
            product.discount
          ),
          updateHistory,
        },
        { new: true }
      );

      productLog.success("Updated product", {
        productId: id,
        userId: user._id,
        changes: normalizedData,
      });

      return updatedProduct;
    } catch (error) {
      productLog.error("Failed to update product", error);
      throw error;
    }
  }

  async updateStatus(id, status, user) {
    try {
      const product = await this.getProductById(id, user);

      const validation = validateGeneralStatusChange(product, status);
      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      const historyRecord = createHistoryRecord(
        user,
        { status },
        "status_update"
      );
      const updateHistory = mergeHistory(product.updateHistory, historyRecord);

      const updatedProduct = await this.model.findByIdAndUpdate(
        id,
        { status, updateHistory },
        { new: true }
      );

      productLog.success("Updated product status", {
        productId: id,
        userId: user._id,
        oldStatus: product.status,
        newStatus: status,
      });

      return updatedProduct;
    } catch (error) {
      productLog.error("Failed to update product status", error);
      throw error;
    }
  }

  // Helper methods
  async buildCategoryPath(categoryId) {
    const categoryPath = [];
    let currentCat = await Category.findById(categoryId);

    while (currentCat) {
      categoryPath.unshift(currentCat._id);
      if (!currentCat.parentCategory) break;
      currentCat = await Category.findById(currentCat.parentCategory);
    }

    return categoryPath;
  }

  calculateFinalPrice(basePrice, discount) {
    if (!discount || !discount.isActive) {
      return basePrice;
    }

    const now = new Date();
    if (
      (!discount.startDate || now >= discount.startDate) &&
      (!discount.endDate || now <= discount.endDate)
    ) {
      return basePrice * (1 - discount.percentage / 100);
    }

    return basePrice;
  }

  async getProductById(id, user) {
    const product = await this.model.findById(id);
    if (!product) {
      throw new Error("Product not found");
    }
    return product;
  }

  async updateDiscount(id, discountData, user) {
    try {
      const product = await this.getProductById(id, user);

      // Validate discount data
      if (discountData.percentage < 0 || discountData.percentage > 100) {
        throw new Error("Discount percentage must be between 0 and 100");
      }

      const now = new Date();
      if (discountData.startDate && new Date(discountData.startDate) < now) {
        throw new Error("Start date cannot be in the past");
      }

      if (discountData.endDate && new Date(discountData.endDate) < now) {
        throw new Error("End date cannot be in the past");
      }

      // Calculate new price with discount
      const discount = {
        percentage: discountData.percentage,
        startDate: discountData.startDate || now,
        endDate: discountData.endDate,
        isActive:
          discountData.isActive !== undefined ? discountData.isActive : true,
      };

      const finalPrice = this.calculateFinalPrice(product.price, discount);

      // Create history record
      const historyRecord = createHistoryRecord(user, {
        discount,
        finalPrice,
        action: "update_discount",
      });
      const updateHistory = mergeHistory(product.updateHistory, historyRecord);

      const updatedProduct = await this.model.findByIdAndUpdate(
        id,
        {
          discount,
          finalPrice,
          updateHistory,
        },
        { new: true }
      );

      productLog.success("Updated product discount", {
        productId: id,
        userId: user._id,
        discount: discountData,
      });

      return updatedProduct;
    } catch (error) {
      productLog.error("Failed to update product discount", error);
      throw error;
    }
  }

  async removeDiscount(id, user) {
    try {
      const product = await this.getProductById(id, user);

      if (!product.discount?.isActive) {
        throw new Error("Product does not have an active discount");
      }

      // Create history record
      const historyRecord = createHistoryRecord(user, {
        discount: null,
        finalPrice: product.price,
        action: "remove_discount",
      });
      const updateHistory = mergeHistory(product.updateHistory, historyRecord);

      await this.model.findByIdAndUpdate(id, {
        discount: {
          percentage: 0,
          isActive: false,
        },
        finalPrice: product.price,
        updateHistory,
      });

      productLog.success("Removed product discount", {
        productId: id,
        userId: user._id,
      });

      return {
        message: "Discount removed successfully",
        productId: id,
        previousPrice: product.finalPrice,
        newPrice: product.price,
      };
    } catch (error) {
      productLog.error("Failed to remove product discount", error);
      throw error;
    }
  }

  async delete(id, user) {
    try {
      const product = await this.getProductById(id, user);

      // Check if product can be deleted
      // Add any business rules here (e.g., check if product is in any orders)

      await product.deleteOne();

      productLog.success("Deleted product", {
        productId: id,
        userId: user._id,
        productName: product.name,
      });

      return { message: "Product deleted successfully" };
    } catch (error) {
      productLog.error("Failed to delete product", error);
      throw error;
    }
  }

  // Helper method for bulk price updates
  async updatePricesByCategory(categoryId, adjustment, adjustmentType, user) {
    try {
      // Kiểm tra category có tồn tại và active
      const category = await Category.findById(categoryId);
      if (!category) {
        throw new Error("Category not found");
      }
      if (category.status !== 1) {
        throw new Error("Category is inactive");
      }

      // Tìm tất cả sản phẩm thuộc category
      const products = await this.model.find({
        category: categoryId,
        status: 1, // Chỉ cập nhật sản phẩm đang active
      });

      if (products.length === 0) {
        throw new Error("No active products found in this category");
      }

      const updates = [];
      const priceUpdates = []; // Lưu thông tin thay đổi giá cho log

      for (const product of products) {
        let newPrice;
        if (adjustmentType === "percentage") {
          newPrice = product.price * (1 + adjustment / 100);
        } else {
          newPrice = product.price + adjustment;
        }

        // Kiểm tra giá mới hợp lệ
        if (newPrice < 0) {
          priceUpdates.push({
            productId: product._id,
            oldPrice: product.price,
            status: "skipped",
            reason: "Resulting price would be negative",
          });
          continue;
        }

        // Tạo history record với thông tin chi tiết về điều chỉnh giá
        const historyRecord = createHistoryRecord(
          user,
          {
            priceChange: {
              oldPrice: product.price,
              newPrice: newPrice,
              adjustment: adjustment,
              adjustmentType: adjustmentType,
              categoryId: categoryId,
            },
          },
          "bulk_price_update"
        );

        const updateHistory = mergeHistory(
          product.updateHistory,
          historyRecord
        );

        // Cập nhật sản phẩm
        const updatePromise = this.model.findByIdAndUpdate(
          product._id,
          {
            price: newPrice,
            finalPrice: this.calculateFinalPrice(newPrice, product.discount),
            updateHistory,
          },
          { new: true }
        );

        updates.push(updatePromise);

        priceUpdates.push({
          productId: product._id,
          productName: product.name,
          oldPrice: product.price,
          newPrice: newPrice,
          status: "updated",
        });
      }

      // Thực hiện cập nhật
      await Promise.all(updates);

      // Log kết quả
      productLog.success("Bulk updated prices by category", {
        categoryId,
        categoryName: category.name,
        adjustment,
        adjustmentType,
        userId: user._id,
        affectedProducts: priceUpdates.length,
        priceUpdates, // Chi tiết các thay đổi
      });

      return {
        message: `Updated prices for ${updates.length} products`,
        categoryId,
        categoryName: category.name,
        adjustment,
        adjustmentType,
        details: priceUpdates,
      };
    } catch (error) {
      productLog.error("Failed to bulk update prices", error, {
        categoryId,
        adjustment,
        adjustmentType,
        userId: user._id,
      });
      throw error;
    }
  }
}

module.exports = new ProductService();
