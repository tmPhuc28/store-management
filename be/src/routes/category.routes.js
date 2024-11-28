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
const {
  statusValidator,
  paginationValidator,
  objectIdValidator,
  sortValidator,
  searchValidator,
} = require("../validators/common.validator");
/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Product category management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated ID
 *         name:
 *           type: string
 *           description: Category name
 *         description:
 *           type: string
 *           description: Category description
 *         parentCategory:
 *           type: string
 *           description: Parent category ID
 *         status:
 *           type: number
 *           enum: [0, 1]
 *           description: Status (0=inactive, 1=active)
 *         createdBy:
 *           type: string
 *           description: ID of the creator
 *         updateHistory:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               updatedBy:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               changes:
 *                 type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: Get a list of categories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
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
 *         description: Search by name or description
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *         description: Filter by status
 *       - in: query
 *         name: parent
 *         schema:
 *           type: string
 *         description: Filter by parent category (null to get root categories)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort by (e.g., -createdAt, name)
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
 *                 count:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 */
router.get(
  "/",
  protect,
  paginationValidator,
  sortValidator,
  searchValidator,
  getCategories
);

/**
 * @swagger
 * /api/v1/categories/top:
 *   get:
 *     summary: Get the top-level categories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: onlyActive
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Only get active categories
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
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 */
router.get("/top", protect, getTopCategories);

/**
 * @swagger
 * /api/v1/categories/leaves:
 *   get:
 *     summary: Get categories without subcategories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Only get active categories
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
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 */
router.get("/leaves", protect, getLeafCategories);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   get:
 *     summary: Get information of a category
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
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 */
router.get("/:id", protect, objectIdValidator(), getCategory);

/**
 * @swagger
 * /api/v1/categories/{id}/path:
 *   get:
 *     summary: Get the path from root to the current category
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
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 pathLength:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 */
router.get("/:id/path", protect, objectIdValidator(), getCategoryPath);

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     summary: Create a new category (Admin)
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
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               parentCategory:
 *                 type: string
 *                 description: Parent category ID
 *               status:
 *                 type: number
 *                 enum: [0, 1]
 *                 default: 1
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 */
router.post(
  "/",
  protect,
  authorize("admin"),
  createCategoryValidator,
  createCategory
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   put:
 *     summary: Update a category (Admin)
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
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               parentCategory:
 *                 type: string
 *               status:
 *                 type: number
 *                 enum: [0, 1]
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 */
router.put(
  "/:id",
  protect,
  authorize("admin"),
  objectIdValidator(),
  updateCategoryValidator,
  updateCategory
);

/**
 * @swagger
 * /api/v1/categories/{id}/status:
 *   patch:
 *     summary: Update category status (Admin)
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: number
 *                 enum: [0, 1]
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 */
router.patch(
  "/:id/status",
  protect,
  authorize("admin"),
  objectIdValidator(),
  statusValidator,
  updateCategoryStatus
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   delete:
 *     summary: Delete a category (Admin)
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
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Cannot delete category with subcategories
 *       404:
 *         description: Category not found
 */
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  objectIdValidator(),
  deleteCategory
);

module.exports = router;
