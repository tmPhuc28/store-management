// src/services/product.service.js
const BaseService = require("./base/base.service");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Manufacturer = require("../models/Manufacturer");
const Supplier = require("../models/Supplier");
const { checkDuplicate } = require("../utils/duplicateCheck");
const generateBarcode = require("../utils/barcodeGenerator");
const QRCode = require("qrcode");
const ProductLocationService = require("./productLocation.service");

class ProductService extends BaseService {
  constructor() {
    super(Product, "Product");
    this.nullableFields = [
      "description",
      "manufacturer",
      "supplier",
      "discount",
      "maxQuantity",
      "variantOptions",
      "images",
      "specifications",
      "warranty.description",
    ];
    this.useHistory = true;
    this.useTransactions = true;
    this.excludeFields = [...this.excludeFields];
    this.locationService = ProductLocationService;
  }

  getSearchFields() {
    return ["name", "code", "sku", "description"];
  }

  getPopulateConfig(view = "list") {
    const configs = {
      list: [
        { path: "category", select: "name" },
        { path: "manufacturer", select: "name" },
        { path: "supplier", select: "name" },
        { path: "createdBy", select: "username" },
      ],
      detail: [
        { path: "category", select: "name code path" },
        { path: "categoryPath", select: "name code" },
        { path: "manufacturer", select: "name code" },
        { path: "supplier", select: "name code" },
        { path: "createdBy", select: "username email" },
        { path: "discontinuedBy", select: "username email" },
        { path: "updateHistory.updatedBy", select: "username email" },
        {
          path: "locations",
          match: { status: 1 },
          select: "-updateHistory",
        },
      ],
    };
    return configs[view] || configs.list;
  }

  buildCustomQuery(params) {
    const query = {};

    if (params.status !== undefined) {
      query.status = parseInt(params.status);
    }

    if (params.category) {
      query.categoryPath = params.category;
    }

    if (params.manufacturer) {
      query.manufacturer = params.manufacturer;
    }

    if (params.supplier) {
      query.supplier = params.supplier;
    }

    if (params.minPrice !== undefined) {
      query.currentPrice = { $gte: parseFloat(params.minPrice) };
    }

    if (params.maxPrice !== undefined) {
      query.currentPrice = {
        ...query.currentPrice,
        $lte: parseFloat(params.maxPrice),
      };
    }

    if (params.hasStock !== undefined) {
      query.quantity = params.hasStock === "true" ? { $gt: 0 } : 0;
    }

    if (params.isDiscontinued !== undefined) {
      query.isDiscontinued = params.isDiscontinued === "true";
    }

    if (params.hasDiscount !== undefined) {
      if (params.hasDiscount === "true") {
        const now = new Date();
        query.discount = { $ne: null };
        query["discount.startDate"] = { $lte: now };
        query.$or = [
          { "discount.endDate": null },
          { "discount.endDate": { $gt: now } },
        ];
      } else {
        query.$or = [
          { discount: null },
          {
            $or: [
              { "discount.startDate": { $gt: new Date() } },
              { "discount.endDate": { $lte: new Date() } },
            ],
          },
        ];
      }
    }

    return query;
  }

  async validateUnique(data, excludeId = null) {
    if (data.code) {
      await checkDuplicate(
        this.model,
        { code: data.code.toUpperCase() },
        excludeId,
        "Product code already exists"
      );
    }

    if (data.sku) {
      await checkDuplicate(
        this.model,
        { sku: data.sku.toUpperCase() },
        excludeId,
        "SKU already exists"
      );
    }
  }

  async validateRelatedEntities(data) {
    const validations = [];

    // Validate category
    if (data.category) {
      validations.push(
        Category.findOne({
          _id: data.category,
          status: 1,
          isLeaf: true,
        }).then((category) => {
          if (!category) {
            throw new Error("Category not found or not a leaf category");
          }
          return category;
        })
      );
    }

    // Validate manufacturer
    if (data.manufacturer) {
      validations.push(
        Manufacturer.findOne({
          _id: data.manufacturer,
          status: 1,
        }).then((manufacturer) => {
          if (!manufacturer) {
            throw new Error("Manufacturer not found or inactive");
          }
          return manufacturer;
        })
      );
    }

    // Validate supplier
    if (data.supplier) {
      validations.push(
        Supplier.findOne({
          _id: data.supplier,
          status: 1,
        }).then((supplier) => {
          if (!supplier) {
            throw new Error("Supplier not found or inactive");
          }
          return supplier;
        })
      );
    }

    await Promise.all(validations);
  }

  async validateStatusChange(document, newStatus) {
    const baseValidation = await super.validateStatusChange(
      document,
      newStatus
    );
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // Cannot activate discontinued product
    if (newStatus === 1 && document.isDiscontinued) {
      return {
        isValid: false,
        message: "Cannot activate discontinued product",
      };
    }

    return { isValid: true };
  }

  async validatePrices(data) {
    if (
      data.importPrice &&
      data.sellingPrice &&
      data.importPrice > data.sellingPrice
    ) {
      throw new Error(
        "Selling price must be greater than or equal to import price"
      );
    }
  }

  async create(data, user = null, options = {}) {
    const session = await this.startTransaction(options);

    try {
      await this.validateUnique(data);
      await this.validateRelatedEntities(data);
      await this.validatePrices(data);

      // Generate barcode and QR code
      const [barcode, qrCode] = await Promise.all([
        generateBarcode(data.sku),
        QRCode.toDataURL(
          JSON.stringify({
            sku: data.sku,
            name: data.name,
            price: data.sellingPrice,
          })
        ),
      ]);

      const productData = {
        ...data,
        barcode,
        qrCode,
        currentPrice: data.sellingPrice, // Initially set to selling price
      };

      const result = await super.create(productData, user, {
        ...options,
        session,
      });

      await this.endTransaction(session, true);
      return result;
    } catch (error) {
      await this.endTransaction(session, false);
      throw error;
    }
  }

  async update(id, data, user = null, options = {}) {
    const session = await this.startTransaction(options);

    try {
      await this.validateUnique(data, id);
      await this.validateRelatedEntities(data);

      // Handle category change
      if (data.category) {
        const category = await Category.findById(data.category);
        data.categoryPath = [...category.path, category._id];
      }

      const result = await super.update(id, data, user, {
        ...options,
        session,
      });

      await this.endTransaction(session, true);
      return result;
    } catch (error) {
      await this.endTransaction(session, false);
      throw error;
    }
  }
  /**
   * Apply discount to product
   */
  async applyDiscountCode(id, code, user) {
    const session = await this.startTransaction();

    try {
      const product = await this.getFullDocument(id);
      await product.applyDiscountCode(code);

      // Add to history
      product.updateHistory.push({
        action: "apply_discount",
        updatedBy: user._id,
        timestamp: new Date(),
        changes: {
          discount: product.discount,
          oldPrice: product.sellingPrice,
          newPrice: product.currentPrice,
        },
      });

      await product.save({ session });

      await this.endTransaction(session, true);
      return this.processResponse(product);
    } catch (error) {
      await this.endTransaction(session, false);
      throw error;
    }
  }

  /**
   * Remove discount from product
   */
  async removeDiscount(id, user) {
    const session = await this.startTransaction();

    try {
      const product = await this.getFullDocument(id);

      if (!product.discount) {
        throw new Error("Product has no active discount");
      }

      const oldDiscount = { ...product.discount };
      product.discount = null;
      product.currentPrice = product.sellingPrice;

      product.updateHistory.push({
        action: "remove_discount",
        updatedBy: user._id,
        timestamp: new Date(),
        changes: {
          removedDiscount: oldDiscount,
          newPrice: product.currentPrice,
        },
      });

      await product.save({ session });

      await this.endTransaction(session, true);
      return this.processResponse(product);
    } catch (error) {
      await this.endTransaction(session, false);
      throw error;
    }
  }

  async discontinue(id, data, user) {
    const session = await this.startTransaction();

    try {
      const product = await this.getFullDocument(id);

      // Update product
      product.isDiscontinued = true;
      product.discontinuedAt = data.effectiveDate || new Date();
      product.discontinuedBy = user._id;
      product.status = 0;

      // Create history record
      const historyRecord = {
        action: "discontinue",
        updatedBy: user._id,
        timestamp: new Date(),
        changes: {
          reason: data.reason,
          effectiveDate: product.discontinuedAt,
        },
      };

      product.updateHistory.push(historyRecord);
      await product.save({ session });

      await this.endTransaction(session, true);

      return this.processResponse(product);
    } catch (error) {
      await this.endTransaction(session, false);
      throw error;
    }
  }

  async adjustQuantity(id, data, user) {
    const session = await this.startTransaction();

    try {
      const product = await this.getFullDocument(id);
      const oldQuantity = product.quantity;
      const adjustment = parseInt(data.adjustment);

      // Calculate new quantity
      const newQuantity = oldQuantity + adjustment;
      if (newQuantity < 0) {
        throw new Error("Adjustment would result in negative quantity");
      }

      // Update quantity
      product.quantity = newQuantity;
      product.isOutOfStock = newQuantity <= 0;

      // Create history record
      const historyRecord = {
        action: "quantity_adjustment",
        updatedBy: user._id,
        timestamp: new Date(),
        changes: {
          oldQuantity,
          adjustment,
          newQuantity,
          reason: data.reason,
          notes: data.notes,
        },
      };

      product.updateHistory.push(historyRecord);
      await product.save({ session });

      await this.endTransaction(session, true);

      return this.processResponse(product);
    } catch (error) {
      await this.endTransaction(session, false);
      throw error;
    }
  }
}

module.exports = new ProductService();
