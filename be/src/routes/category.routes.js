// src/routes/category.routes.js
const express = require("express");
const router = express.Router();
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
  getCategoryPath,
  getLeafCategories,
  getTopCategories,
} = require("../controllers/category.controller");
const { protect, authorize } = require("../middleware/auth");
const {
  createCategoryValidator,
  updateCategoryValidator,
} = require("../validators/category.validator");

const protectedRouter = express.Router();
const adminRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Quản lý danh mục sản phẩm
 */

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
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
 *         description: Search categories by name or description
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Success
 */
protectedRouter.get("/", getCategories);

/**
 * @swagger
 * /api/v1/categories/top:
 *   get:
 *     summary: Lấy danh sách category cấp cao nhất
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *       401:
 *         description: Chưa xác thực
 *       500:
 *         description: Lỗi server
 */
protectedRouter.get("/top", protect, getTopCategories);
/**
 * @swagger
 * /api/v1/categories/leaves:
 *   get:
 *     summary: Lấy danh sách category không có con
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Chỉ lấy category đang active
 *     responses:
 *       200:
 *         description: Thành công
 *       401:
 *         description: Chưa xác thực
 *       500:
 *         description: Lỗi server
 */
protectedRouter.get("/leaves", protect, getLeafCategories);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: Category not found
 */
protectedRouter.get("/:id", getCategory);

/**
 * @swagger
 * /api/v1/categories/{id}/path:
 *   get:
 *     summary: Lấy đường dẫn từ gốc đến category hiện tại
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của category
 *     responses:
 *       200:
 *         description: Thành công
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy category
 *       500:
 *         description: Lỗi server
 */
protectedRouter.get("/:id/path", protect, getCategoryPath);

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     summary: Create new category (Admin only)
 *     tags: [Categories]
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
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 example: Electronics
 *               description:
 *                 type: string
 *                 example: Electronic devices and accessories
 *               status:
 *                 type: number
 *                 enum: [0, 1]
 *                 example: 1
 *               parentCategory:
 *                 type: string
 *                 example: 60d725c3e95d1d2b9c8c2c31
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error or category already exists
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Admin access required
 */
adminRouter.post("/", createCategoryValidator, createCategory);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   put:
 *     summary: Update category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Electronics
 *               description:
 *                 type: string
 *                 example: Updated description
 *               status:
 *                 type: number
 *                 enum: [0, 1]
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 */
adminRouter.put("/:id", updateCategoryValidator, updateCategory);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   delete:
 *     summary: Delete category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Cannot delete category with subcategories
 *       404:
 *         description: Category not found
 */
adminRouter.delete("/:id", deleteCategory);

/**
 * @swagger
 * /api/v1/categories/{id}/status:
 *   patch:
 *     tags: [Categories]
 *     summary: Update category status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
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
 *         description: Category status updated successfully
 *       404:
 *         description: Category not found
 */
adminRouter.patch("/:id/status", updateCategoryStatus);

router.use("/", protect, protectedRouter);
router.use("/", protect, authorize("admin"), adminRouter);

module.exports = router;
