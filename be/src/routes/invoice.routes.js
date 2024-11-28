// src/routes/invoice.routes.js
const express = require("express");
const router = express.Router();
const {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoiceStatus,
  updatePaymentStatus,
  cancelInvoice,
  getInvoiceStatistics,
  getCustomerInvoices,
} = require("../controllers/invoice.controller");
const { protect } = require("../middleware/auth");
const {
  createInvoiceValidator,
  updateStatusValidator,
  updatePaymentStatusValidator,
} = require("../validators/invoice.validator");

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Quản lý hóa đơn
 */

/**
 * @swagger
 * /api/v1/invoices:
 *   get:
 *     tags: [Invoices]
 *     summary: Get all invoices
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
 *         description: "Filter by status (0 = inactive, 1 = active)"
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, paid, cancelled]
 *         description: Filter by payment status
 *       - in: query
 *         name: customer
 *         schema:
 *           type: string
 *         description: Filter by customer ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 */
router.get("/", protect, getInvoices);

/**
 * @swagger
 * /api/v1/invoices/{id}:
 *   get:
 *     tags: [Invoices]
 *     summary: Get single invoice
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
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
 *                   $ref: '#/components/schemas/Invoice'
 *       404:
 *         description: Invoice not found
 */
router.get("/:id", protect, getInvoice);

/**
 * @swagger
 * /api/v1/invoices:
 *   post:
 *     tags: [Invoices]
 *     summary: Create new invoice
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer
 *               - items
 *               - paymentMethod
 *             properties:
 *               customer:
 *                 type: string
 *                 description: Customer ID
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - product
 *                     - quantity
 *                     - price
 *                   properties:
 *                     product:
 *                       type: string
 *                       description: Product ID
 *                     quantity:
 *                       type: number
 *                       minimum: 1
 *                     price:
 *                       type: number
 *                       minimum: 0
 *                     discount:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, bank_transfer, qr_code]
 *               discount:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               tax:
 *                 type: number
 *                 minimum: 0
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *       400:
 *         description: Validation error or insufficient product quantity
 */
router.post("/", protect, createInvoiceValidator, createInvoice);

/**
 * @swagger
 * /api/v1/invoices/{id}/payment-status:
 *   patch:
 *     tags: [Invoices]
 *     summary: Update payment status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentStatus
 *             properties:
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, paid, cancelled]
 */
router.patch(
  "/:id/payment-status",
  protect,
  updatePaymentStatusValidator,
  updatePaymentStatus
);

/**
 * @swagger
 * /api/v1/invoices/{id}/cancel:
 *   patch:
 *     tags: [Invoices]
 *     summary: Cancel invoice
 *     description: Cancels invoice and returns products to inventory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice cancelled successfully
 *       400:
 *         description: Invoice is already cancelled
 *       404:
 *         description: Invoice not found
 */
router.patch("/:id/cancel", protect, cancelInvoice);

/**
 * @swagger
 * /api/v1/invoices/statistics:
 *   get:
 *     tags: [Invoices]
 *     summary: Get invoice statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalInvoices:
 *                       type: number
 *                     totalRevenue:
 *                       type: number
 *                     averageValue:
 *                       type: number
 *                     minValue:
 *                       type: number
 *                     maxValue:
 *                       type: number
 *                 paymentMethods:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       count:
 *                         type: number
 *                       total:
 *                         type: number
 *                 dailyRevenue:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       revenue:
 *                         type: number
 *                       count:
 *                         type: number
 */
router.get("/statistics", protect, getInvoiceStatistics);

/**
 * @swagger
 * /api/v1/invoices/customer/{customerId}:
 *   get:
 *     tags: [Invoices]
 *     summary: Get customer invoice history
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
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
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: Customer not found
 */
router.get("/customer/:customerId", protect, getCustomerInvoices);

module.exports = router;
