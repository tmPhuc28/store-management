// src/controllers/product.controller.js
const Product = require("../models/Product");
const Category = require("../models/Category");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger");
const QRCode = require("qrcode");
const generateBarcode = require("../utils/barcodeGenerator");
const { validateGeneralStatusChange } = require("../utils/statusValidator");

// @desc    Get all products with full category path
// @route   GET /api/v1/products
// @access  Private
exports.getProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const sortBy = req.query.sortBy || "-createdAt";
    const search = req.query.search || "";
    const category = req.query.category;
    const status =
      req.query.status !== undefined ? parseInt(req.query.status) : undefined;

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Xử lý filter theo category (bao gồm cả subcategories)
    if (category) {
      const categoryDoc = await Category.findById(category);
      if (categoryDoc) {
        const childCategories = await Category.find({
          $or: [{ _id: category }, { parentCategory: category }],
        });
        const categoryIds = childCategories.map((cat) => cat._id);
        query.category = { $in: categoryIds };
      }
    }

    if (status !== undefined && (status === 0 || status === 1)) {
      query.status = status;
    }

    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .populate({
          path: "category",
          populate: {
            path: "parentCategory",
            model: "Category",
            select: "name parentCategory",
          },
        })
        .sort(sortBy)
        .skip(startIndex)
        .limit(limit),
    ]);

    // Xử lý category path cho mỗi sản phẩm
    const productsWithCategoryPath = await Promise.all(
      products.map(async (product) => {
        const productObj = product.toObject();
        const categoryPath = [];
        let currentCat = product.category;

        while (currentCat) {
          categoryPath.unshift(currentCat.name);
          currentCat = currentCat.parentCategory;
        }

        return {
          ...productObj,
          categoryPath: categoryPath.join(" > "),
          category: {
            _id: product.category._id,
            name: product.category.name,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: productsWithCategoryPath,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Private
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("categoryPath", "name")
      .populate("category", "name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const formattedProduct = {
      ...product.toObject(),
      categoryPath: product.categoryPath.map((cat) => cat.name).join(" > "),
    };

    res.status(200).json({
      success: true,
      data: formattedProduct,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product
// @route   POST /api/v1/products
// @access  Private/Admin
exports.createProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Kiểm tra SKU
    const existingProduct = await Product.findOne({
      sku: req.body.sku,
      status: 1,
    });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Active product with this SKU already exists",
      });
    }

    // Kiểm tra category có phải là leaf node không
    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const hasChildren = await Category.findOne({
      parentCategory: req.body.category,
    });
    if (hasChildren) {
      return res.status(400).json({
        success: false,
        message: "Products can only be assigned to leaf categories",
      });
    }

    // Generate codes
    const [barcode, qrCode] = await Promise.all([
      generateBarcode(req.body.sku),
      QRCode.toDataURL(
        JSON.stringify({
          sku: req.body.sku,
          name: req.body.name,
          price: req.body.price,
          category: req.body.category,
        })
      ),
    ]);

    // Xây dựng category path
    const categoryPath = [];
    let currentCat = category;
    while (currentCat) {
      categoryPath.unshift(currentCat._id);
      if (!currentCat.parentCategory) break;
      currentCat = await Category.findById(currentCat.parentCategory);
    }

    const productData = {
      ...req.body,
      status: req.body.status !== undefined ? parseInt(req.body.status) : 1,
      barcode,
      qrCode,
      categoryPath,
      updateHistory: [
        {
          updatedBy: req.user._id,
          changes: req.body,
        },
      ],
    };

    const product = await Product.create(productData);
    await product.populate([
      {
        path: "category",
        select: "name",
      },
      {
        path: "categoryPath",
        select: "name",
      },
    ]);

    // Format response
    const formattedProduct = {
      ...product.toObject(),
      categoryPath: product.categoryPath.map((cat) => cat.name).join(" > "),
    };

    logger.info(`Product created: ${product.name} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: formattedProduct,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Nếu category thay đổi, cập nhật categoryPath
    if (
      req.body.category &&
      req.body.category !== product.category.toString()
    ) {
      const category = await Category.findById(req.body.category);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const hasChildren = await Category.findOne({
        parentCategory: req.body.category,
      });
      if (hasChildren) {
        return res.status(400).json({
          success: false,
          message: "Products can only be assigned to leaf categories",
        });
      }

      // Cập nhật category path
      const categoryPath = [];
      let currentCat = category;
      while (currentCat) {
        categoryPath.unshift(currentCat._id);
        if (!currentCat.parentCategory) break;
        currentCat = await Category.findById(currentCat.parentCategory);
      }
      req.body.categoryPath = categoryPath;
    }

    const updateHistory = [
      ...product.updateHistory,
      {
        updatedBy: req.user._id,
        changes: req.body,
      },
    ];

    product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updateHistory },
      { new: true, runValidators: true }
    ).populate([
      {
        path: "category",
        select: "name",
      },
      {
        path: "categoryPath",
        select: "name",
      },
    ]);

    const formattedProduct = {
      ...product.toObject(),
      categoryPath: product.categoryPath.map((cat) => cat.name).join(" > "),
    };

    logger.info(`Product updated: ${product.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: formattedProduct,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await product.deleteOne();

    logger.info(`Product deleted: ${product.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product status
// @route   PATCH /api/v1/products/:id/status
// @access  Private/Admin
exports.updateProductStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const statusNum = parseInt(status);

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Sử dụng general validator
    const validation = validateGeneralStatusChange(product, statusNum);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }
    const updateProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        status: statusNum,
        $push: {
          updateHistory: {
            updatedBy: req.user._id,
            changes: { status: statusNum },
          },
        },
      },
      { new: true }
    );

    logger.info(
      `Product status updated: ${product.name} to ${statusNum} by ${req.user.email}`
    );

    res.status(200).json({
      success: true,
      data: updateProduct,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove product discount only
// @route   PATCH /api/v1/products/:id/remove-discount
// @access  Private/Admin
exports.removeDiscount = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    // Kiểm tra xem sản phẩm có đang giảm giá không
    if (!product.discount || !product.discount.isActive) {
      return res.status(400).json({
        success: false,
        message: "Sản phẩm này hiện không có giảm giá",
      });
    }

    // Chỉ cập nhật phần discount, giữ nguyên các thông tin khác
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          "discount.isActive": false,
          "discount.endDate": new Date(), // Kết thúc giảm giá ngay lập tức
        },
        $push: {
          updateHistory: {
            updatedBy: req.user._id,
            timestamp: new Date(),
            changes: {
              type: "remove_discount",
              oldDiscount: {
                percentage: product.discount.percentage,
                startDate: product.discount.startDate,
                endDate: product.discount.endDate,
              },
            },
          },
        },
      },
      { new: true }
    ).populate("category", "name");

    logger.info(
      `Đã xóa giảm giá của sản phẩm ${product.name} (${product.discount.percentage}%) bởi ${req.user.email}`
    );

    res.status(200).json({
      success: true,
      message: "Đã xóa giảm giá sản phẩm thành công",
      data: {
        productId: product._id,
        name: product.name,
        previousDiscount: {
          percentage: product.discount.percentage,
          startDate: product.discount.startDate,
          endDate: product.discount.endDate,
        },
        currentPrice: product.price,
        status: product.status, // Để thấy rõ sản phẩm vẫn giữ nguyên trạng thái
      },
    });
  } catch (error) {
    next(error);
  }
};
