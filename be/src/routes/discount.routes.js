// src/routes/discount.routes.js
const express = require("express");
const router = express.Router();
const {
  getDiscounts,
  createDiscount,
  validateDiscount,
  updateDiscountStatus,
  deleteDiscount,
} = require("../controllers/discount.controller");
const { protect, authorize } = require("../middleware/auth");
const {
  createDiscountValidator,
  validateDiscountCodeValidator,
  updateDiscountStatusValidator,
} = require("../validators/discount.validator");

/**
 * @swagger
 * tags:
 *   name: Discounts
 *   description: Quản lý mã giảm giá
 */

/**
 * @swagger
 * /api/v1/discounts:
 *   get:
 *     summary: Lấy danh sách mã giảm giá
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng mỗi trang
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Thành công
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
 *                     $ref: '#/components/schemas/Discount'
 */
router.get("/", protect, getDiscounts);

/**
 * @swagger
 * /api/v1/discounts:
 *   post:
 *     summary: Tạo mã giảm giá mới
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
 *               - description
 *               - type
 *               - value
 *               - minOrderValue
 *               - maxDiscount
 *               - startDate
 *               - endDate
 *               - usageLimit
 *             properties:
 *               code:
 *                 type: string
 *                 description: Mã giảm giá
 *               description:
 *                 type: string
 *                 description: Mô tả mã giảm giá
 *               type:
 *                 type: string
 *                 enum: [percentage, fixed]
 *                 description: Loại giảm giá
 *               value:
 *                 type: number
 *                 description: Giá trị giảm giá
 *               minOrderValue:
 *                 type: number
 *                 description: Giá trị đơn hàng tối thiểu
 *               maxDiscount:
 *                 type: number
 *                 description: Giá trị giảm tối đa (chỉ áp dụng cho loại percentage)
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Ngày bắt đầu
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Ngày kết thúc
 *               usageLimit:
 *                 type: integer
 *                 description: Giới hạn sử dụng (null = không giới hạn)
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc mã đã tồn tại
 */
router.post(
  "/",
  protect,
  authorize("admin"),
  createDiscountValidator,
  createDiscount
);

/**
 * @swagger
 * /api/v1/discounts/validate:
 *   post:
 *     summary: Kiểm tra và tính toán giá trị giảm giá
 *     tags: [Discounts]
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
 *                 description: Mã giảm giá
 *               orderValue:
 *                 type: number
 *                 description: Giá trị đơn hàng
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                     type:
 *                       type: string
 *                     value:
 *                       type: number
 *                     discountAmount:
 *                       type: number
 *       400:
 *         description: Mã không hợp lệ hoặc không thể áp dụng
 *       404:
 *         description: Không tìm thấy mã giảm giá
 */
router.post("/validate", validateDiscountCodeValidator, validateDiscount);

/**
 * @swagger
 * /api/v1/discounts/{id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái mã giảm giá
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID mã giảm giá
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
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy mã giảm giá
 */
router.patch(
  "/:id/status",
  protect,
  authorize("admin"),
  updateDiscountStatusValidator,
  updateDiscountStatus
);

/**
 * @swagger
 * /api/v1/discounts/{id}:
 *   delete:
 *     summary: Xóa mã giảm giá
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID mã giảm giá
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       400:
 *         description: Không thể xóa mã đã được sử dụng
 *       404:
 *         description: Không tìm thấy mã giảm giá
 */
router.delete("/:id", protect, authorize("admin"), deleteDiscount);

module.exports = router;
