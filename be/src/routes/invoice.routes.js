const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const invoiceController = require("../controllers/invoice.controller");
const {
  createInvoiceValidator,
  updateStatusValidator,
  confirmPaymentValidator,
  getInvoicesValidator,
  statisticsValidator,
  refundValidator,
} = require("../validators/invoice.validator");

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Invoice management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     InvoiceItem:
 *       type: object
 *       required:
 *         - product
 *         - quantity
 *       properties:
 *         product:
 *           type: string
 *           description: Product ID
 *         quantity:
 *           type: number
 *           minimum: 1
 *           description: Quantity of product
 *
 *     CreateInvoice:
 *       type: object
 *       required:
 *         - customer
 *         - items
 *         - paymentMethod
 *       properties:
 *         customer:
 *           type: string
 *           description: Customer ID
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InvoiceItem'
 *         paymentMethod:
 *           type: string
 *           enum: [cash, bank_transfer]
 *         discountCode:
 *           type: string
 *         notes:
 *           type: string
 *
 *     PaymentConfirmation:
 *       type: object
 *       required:
 *         - amount
 *       properties:
 *         amount:
 *           type: number
 *           description: Payment amount
 *         transactionId:
 *           type: string
 *           description: Required for bank transfer
 *         notes:
 *           type: string
 */

/**
 * @swagger
 * /api/v2/invoices:
 *   get:
 *     summary: Get all invoices
 *     tags: [Invoices]
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
 *           type: string
 *           enum: [pending, confirmed, paid, completed, canceled, refunded]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/", protect, getInvoicesValidator, invoiceController.getInvoices);

/**
 * @swagger
 * /api/v2/invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     tags: [Invoices]
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
 *         description: Success
 */
router.get("/:id", protect, invoiceController.getInvoice);

/**
 * @swagger
 * /api/v2/invoices:
 *   post:
 *     summary: Create new invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInvoice'
 *     responses:
 *       201:
 *         description: Invoice created successfully
 */
router.post(
  "/",
  protect,
  createInvoiceValidator,
  invoiceController.createInvoice
);

/**
 * @swagger
 * /api/v2/invoices/{id}/status:
 *   patch:
 *     summary: Update invoice status
 *     tags: [Invoices]
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
 *                 type: string
 *                 enum: [confirmed, paid, completed, canceled, refunded]
 *               reason:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch(
  "/:id/status",
  protect,
  updateStatusValidator,
  invoiceController.updateStatus
);

/**
 * @swagger
 * /api/v2/invoices/{id}/payment:
 *   post:
 *     summary: Confirm invoice payment
 *     tags: [Invoices]
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
 *             $ref: '#/components/schemas/PaymentConfirmation'
 *     responses:
 *       200:
 *         description: Payment confirmed successfully
 */
router.post(
  "/:id/payment",
  protect,
  confirmPaymentValidator,
  invoiceController.confirmPayment
);

/**
 * @swagger
 * /api/v2/invoices/{id}/qr:
 *   get:
 *     summary: Get payment QR code
 *     tags: [Invoices]
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
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qrCode:
 *                   type: string
 */
router.get("/:id/qr", protect, invoiceController.getPaymentQR);

/**
 * @swagger
 * /api/v2/invoices/statistics/daily:
 *   get:
 *     summary: Get daily revenue statistics
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  "/statistics/daily",
  protect,
  authorize("admin"),
  statisticsValidator,
  invoiceController.getDailyRevenue
);

/**
 * @swagger
 * /api/v2/invoices/statistics/top-products:
 *   get:
 *     summary: Get top selling products
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  "/statistics/top-products",
  protect,
  authorize("admin"),
  statisticsValidator,
  invoiceController.getTopProducts
);

/**
 * @swagger
 * /api/v2/invoices/statistics/payment-methods:
 *   get:
 *     summary: Get payment method statistics
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  "/statistics/payment-methods",
  protect,
  authorize("admin"),
  statisticsValidator,
  invoiceController.getPaymentStats
);

/**
 * @swagger
 * /api/v2/invoices/{id}/refund:
 *   post:
 *     summary: Process invoice refund
 *     tags: [Invoices]
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
 *               - refundAmount
 *               - reason
 *               - refundMethod
 *             properties:
 *               refundAmount:
 *                 type: number
 *               reason:
 *                 type: string
 *               refundMethod:
 *                 type: string
 *                 enum: [cash, bank_transfer]
 *               bankInfo:
 *                 type: object
 *     responses:
 *       200:
 *         description: Refund processed successfully
 */
router.post(
  "/:id/refund",
  protect,
  refundValidator,
  invoiceController.handleRefund
);

/**
 * @swagger
 * /api/v2/invoices/customer/{customerId}:
 *   get:
 *     summary: Get customer's invoice history
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  "/customer/:customerId",
  protect,
  invoiceController.getCustomerInvoices
);

/**
 * @swagger
 * /api/v2/invoices/{id}/history:
 *   get:
 *     summary: Get invoice status history
 *     tags: [Invoices]
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
 *         description: Success
 */
router.get("/:id/history", protect, invoiceController.getStatusHistory);

/**
 * @swagger
 * /api/v2/invoices/statistics:
 *   get:
 *     summary: Get comprehensive invoice statistics
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [daily, monthly, payment_methods, top_products]
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  "/statistics",
  protect,
  authorize("admin"),
  statisticsValidator,
  invoiceController.getInvoiceStatistics
);

module.exports = router;
