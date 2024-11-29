// src/routes/discount.routes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const discountController = require("../controllers/discount.controller");
const {
  createDiscountValidator,
  updateDiscountValidator,
  validateDiscountValidator,
  updateDiscountStatusValidator,
  getDiscountsValidator,
} = require("../validators/discount.validator");
const { objectIdValidator } = require("../validators/common.validator");

/**
 * @swagger
 * components:
 *   schemas:
 *     Discount:
 *       type: object
 *       required:
 *         - code
 *         - description
 *         - type
 *         - value
 *         - startDate
 *       properties:
 *         code:
 *           type: string
 *           description: Unique discount code
 *           example: "SUMMER2024"
 *         description:
 *           type: string
 *           description: Discount description
 *           example: "Summer sale discount"
 *         type:
 *           type: string
 *           enum: [percentage, fixed]
 *           example: "percentage"
 *         value:
 *           type: number
 *           description: Discount value (percentage or fixed amount)
 *           example: 10
 *         minOrderValue:
 *           type: number
 *           description: Minimum order value required
 *           example: 100000
 *         maxDiscount:
 *           type: number
 *           description: Maximum discount amount for percentage type
 *           example: 50000
 *         startDate:
 *           type: string
 *           format: date-time
 *           example: "2024-06-01T00:00:00.000Z"
 *         endDate:
 *           type: string
 *           format: date-time
 *           example: "2024-06-30T23:59:59.999Z"
 *         usageLimit:
 *           type: integer
 *           description: Maximum number of times discount can be used
 *           example: 100
 *         usedCount:
 *           type: integer
 *           description: Number of times discount has been used
 *           example: 0
 *         status:
 *           type: integer
 *           enum: [0, 1]
 *           description: 0=inactive, 1=active
 *           example: 1
 */

/**
 * @swagger
 * tags:
 *   name: Discounts
 *   description: Discount code management
 */

/**
 * @swagger
 * /api/v1/discounts:
 *   get:
 *     summary: Get all discounts
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
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
 *         name: status
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *         description: Filter by status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [percentage, fixed]
 *         description: Filter by type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter currently active discounts
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  "/",
  protect,
  getDiscountsValidator,
  discountController.getDiscounts
);

/**
 * @swagger
 * /api/v1/discounts/validate:
 *   post:
 *     summary: Validate a discount code
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - orderValue
 *             properties:
 *               code:
 *                 type: string
 *               orderValue:
 *                 type: number
 *     responses:
 *       200:
 *         description: Success
 */
router.post(
  "/validate",
  protect,
  validateDiscountValidator,
  discountController.validateDiscount
);

/**
 * @swagger
 * /api/v1/discounts/statistics:
 *   get:
 *     summary: Get discount statistics (Admin)
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  "/statistics",
  protect,
  authorize("admin"),
  discountController.getDiscountStatistics
);

/**
 * @swagger
 * /api/v1/discounts:
 *   post:
 *     summary: Create new discount (Admin)
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Discount'
 *     responses:
 *       201:
 *         description: Discount created successfully
 */
router.post(
  "/",
  protect,
  authorize("admin"),
  createDiscountValidator,
  discountController.createDiscount
);

/**
 * @swagger
 * /api/v1/discounts/{id}:
 *   put:
 *     summary: Update discount (Admin)
 *     tags: [Discounts]
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
 *             $ref: '#/components/schemas/Discount'
 *     responses:
 *       200:
 *         description: Discount updated successfully
 */
router.put(
  "/:id",
  protect,
  authorize("admin"),
  [objectIdValidator("id"), updateDiscountValidator],
  discountController.updateDiscount
);

/**
 * @swagger
 * /api/v1/discounts/{id}/status:
 *   patch:
 *     summary: Update discount status (Admin)
 *     tags: [Discounts]
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
  [objectIdValidator("id"), updateDiscountStatusValidator],
  discountController.updateDiscountStatus
);

/**
 * @swagger
 * /api/v1/discounts/{id}:
 *   delete:
 *     summary: Delete discount (Admin)
 *     tags: [Discounts]
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
 *         description: Discount deleted successfully
 */
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  objectIdValidator("id"),
  discountController.deleteDiscount
);

module.exports = router;
