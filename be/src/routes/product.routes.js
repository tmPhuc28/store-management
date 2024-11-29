// src/routes/product.routes.js
const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");
const { protect, authorize } = require("../middleware/auth");
const {
  createProductValidator,
  updateProductValidator,
  discountValidator,
  bulkPriceUpdateValidator,
} = require("../validators/product.validator");
const {
  statusValidator,
  paginationValidator,
  sortValidator,
  searchValidator,
  objectIdValidator,
} = require("../validators/common.validator");

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateProductInput:
 *       type: object
 *       required:
 *         - name
 *         - sku
 *         - description
 *         - price
 *         - quantity
 *         - category
 *       properties:
 *         name:
 *           type: string
 *           description: Product name
 *           example: "iPhone 14 Pro"
 *         sku:
 *           type: string
 *           description: Stock Keeping Unit (must be unique)
 *           example: "IP14PRO-256-BLK"
 *         description:
 *           type: string
 *           description: Product detailed description
 *           example: "Latest iPhone with dynamic island feature"
 *         price:
 *           type: number
 *           description: Base price before discount
 *           example: 999.99
 *         quantity:
 *           type: integer
 *           description: Initial stock quantity
 *           example: 100
 *         category:
 *           type: string
 *           description: Category ID (must be a leaf category)
 *           example: "64f12d45b84d5e7c40437fac"
 *         manufacturer:
 *           type: string
 *           description: (Optional) Manufacturer name
 *           example: "Apple Inc."
 *         supplier:
 *           type: string
 *           description: (Optional) Supplier name
 *           example: "Apple Authorized Distributor"
 *         variants:
 *           type: array
 *           description: (Optional) Product variants like size, color
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Color"
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Black", "Silver", "Gold"]
 *         status:
 *           type: integer
 *           enum: [0, 1]
 *           default: 1
 *           description: (Optional) Product status, defaults to active(1)
 *
 *     UpdateProductInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: (Optional) Product name
 *         description:
 *           type: string
 *           description: (Optional) Product description
 *         price:
 *           type: number
 *           description: (Optional) Base price
 *         quantity:
 *           type: integer
 *           description: (Optional) Stock quantity
 *         category:
 *           type: string
 *           description: (Optional) Category ID
 *         manufacturer:
 *           type: string
 *           description: (Optional) Manufacturer name
 *         supplier:
 *           type: string
 *           description: (Optional) Supplier name
 *         variants:
 *           type: array
 *           description: (Optional) Product variants
 *         status:
 *           type: integer
 *           enum: [0, 1]
 *           description: (Optional) Product status
 */

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management
 */

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get all products with pagination and filters
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Results per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, SKU, or description
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *         description: Filter by status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort field (prefix with - for DESC)
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */
router.get(
  "/",
  protect,
  [paginationValidator, sortValidator, searchValidator],
  productController.getProducts
);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 */
router.get(
  "/:id",
  protect,
  objectIdValidator("id"),
  productController.getProduct
);

/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     summary: Create new product (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductInput'
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       description: Auto-generated product ID
 *                     barcode:
 *                       type: string
 *                       description: Auto-generated barcode
 *                     qrCode:
 *                       type: string
 *                       description: Auto-generated QR code
 *                     finalPrice:
 *                       type: number
 *                       description: Calculated final price
 *                     # Include other fields from CreateProductInput
 *       400:
 *         description: Validation error or duplicate SKU
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not admin
 */
router.post(
  "/",
  protect,
  authorize("admin"),
  createProductValidator,
  productController.createProduct
);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   put:
 *     summary: Update product (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProductInput'
 *     responses:
 *       200:
 *         description: Product updated successfully
 */
router.put(
  "/:id",
  protect,
  authorize("admin"),
  [objectIdValidator("id"), updateProductValidator],
  productController.updateProduct
);

/**
 * @swagger
 * /api/v1/products/{id}/status:
 *   patch:
 *     summary: Update product status (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: integer
 *                 enum: [0, 1]
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch(
  "/:id/status",
  protect,
  authorize("admin"),
  [objectIdValidator("id"), statusValidator],
  productController.updateProductStatus
);

/**
 * @swagger
 * /api/v1/products/{id}/discount:
 *   put:
 *     summary: Update product discount (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - percentage
 *             properties:
 *               percentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Discount updated successfully
 */
router.put(
  "/:id/discount",
  protect,
  authorize("admin"),
  [objectIdValidator("id"), discountValidator],
  productController.updateDiscount
);

/**
 * @swagger
 * /api/v1/products/{id}/discount:
 *   delete:
 *     summary: Remove product discount (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Discount removed successfully
 */
router.delete(
  "/:id/discount",
  protect,
  authorize("admin"),
  objectIdValidator("id"),
  productController.removeDiscount
);

/**
 * @swagger
 * /api/v1/products/category/{categoryId}/prices:
 *   patch:
 *     summary: Bulk update prices by category (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adjustment
 *               - adjustmentType
 *             properties:
 *               adjustment:
 *                 type: number
 *                 description: Amount or percentage to adjust
 *               adjustmentType:
 *                 type: string
 *                 enum: [fixed, percentage]
 *     responses:
 *       200:
 *         description: Prices updated successfully
 */
router.patch(
  "/category/:categoryId/prices",
  protect,
  authorize("admin"),
  [objectIdValidator("categoryId"), bulkPriceUpdateValidator],
  productController.updatePricesByCategory
);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   delete:
 *     summary: Delete product (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted successfully
 */
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  objectIdValidator("id"),
  productController.deleteProduct
);

module.exports = router;
