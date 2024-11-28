// src/routes/product.routes.js
const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  removeDiscount,
} = require("../controllers/product.controller");
const { protect, authorize } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Quản lý sản phẩm
 */

// --------- Public Routes ---------
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
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, description, or SKU
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
 *           example: -createdAt
 *         description: Sort by field (prefix with - for descending)
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/", getProducts);

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
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: Product not found
 */
router.get("/:id", getProduct);

// --------- Protected Routes (Login Required) ---------
router.use(protect);

// --------- Admin Only Routes ---------
router.use(authorize("admin"));

/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     summary: Create new product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - sku
 *               - description
 *               - price
 *               - quantity
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Product Name"
 *               sku:
 *                 type: string
 *                 example: "PRD001"
 *               description:
 *                 type: string
 *                 example: "Product description"
 *               price:
 *                 type: number
 *                 example: 99.99
 *               quantity:
 *                 type: integer
 *                 example: 100
 *               category:
 *                 type: string
 *                 example: "categoryId"
 *               manufacturer:
 *                 type: string
 *                 example: "Manufacturer Name"
 *               supplier:
 *                 type: string
 *                 example: "Supplier Name"
 *               variants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Size"
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["S", "M", "L"]
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post("/", createProduct);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   put:
 *     summary: Update product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               quantity:
 *                 type: integer
 *               description:
 *                 type: string
 *               status:
 *                 type: number
 *                 enum: [0, 1]
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 */
router.put("/:id", updateProduct);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   delete:
 *     summary: Delete product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 */
router.delete("/:id", deleteProduct);

/**
 * @swagger
 * /api/v1/products/{id}/status:
 *   patch:
 *     summary: Update product status (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
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
 *                 type: number
 *                 enum: [0, 1]
 *                 description: "0 = inactive, 1 = active"
 *     responses:
 *       200:
 *         description: Product status updated successfully
 *       404:
 *         description: Product not found
 */
router.patch("/:id/status", updateProductStatus);

/**
 * @swagger
 * /api/v1/products/{id}/discount:
 *   delete:
 *     tags: [Products]
 *     summary: Xóa giảm giá sản phẩm
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
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy sản phẩm
 */
router.delete(
  "/:id/remove-discount",
  protect,
  authorize("admin"),
  removeDiscount
);

module.exports = router;
