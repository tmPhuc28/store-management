// src/routes/invoice.routes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  validateDiscountCode,
  checkDiscountAvailability,
} = require("../middleware/discount");
const invoiceController = require("../controllers/invoice.controller");
const {
  createInvoiceValidator,
  updatePaymentStatusValidator,
  getInvoicesValidator,
  getStatisticsValidator,
  exportInvoicesValidator,
} = require("../validators/invoice.validator");
const { objectIdValidator } = require("../validators/common.validator");

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
 *           type: integer
 *           minimum: 1
 *           description: Item quantity
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
 *           enum: [cash, card, bank_transfer, qr_code]
 *         discount:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Optional discount percentage
 *         notes:
 *           type: string
 *           description: Optional notes
 *
 *     Invoice:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateInvoice'
 *         - type: object
 *           properties:
 *             _id:
 *               type: string
 *             invoiceNumber:
 *               type: string
 *             subTotal:
 *               type: number
 *             total:
 *               type: number
 *             paymentStatus:
 *               type: string
 *               enum: [pending, paid, cancelled]
 *             qrCode:
 *               type: string
 *             createdAt:
 *               type: string
 *               format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Invoice management
 */

/**
 * @swagger
 * /api/v1/invoices:
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
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, paid, cancelled]
 *         description: Filter by payment status
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/", protect, getInvoicesValidator, invoiceController.getInvoices);

/**
 * @swagger
 * /api/v1/invoices/statistics:
 *   get:
 *     summary: Get invoice statistics
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
  "/statistics",
  protect,
  authorize("admin"),
  getStatisticsValidator,
  invoiceController.getInvoiceStatistics
);

/**
 * @swagger
 * /api/v1/invoices/validate-discount:
 *   get:
 *     summary: Validate a discount code
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: discountCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Discount code validation result
 */
router.get("/validate-discount", protect, checkDiscountAvailability);

/**
 * @swagger
 * /api/v1/invoices/export:
 *   get:
 *     summary: Export invoices
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, xlsx]
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
 *         description: File downloaded successfully
 */
router.get(
  "/export",
  protect,
  authorize("admin"),
  exportInvoicesValidator,
  invoiceController.exportInvoices
);

/**
 * @swagger
 * /api/v1/invoices/customer/{customerId}:
 *   get:
 *     summary: Get customer invoices
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  "/customer/:customerId",
  protect,
  objectIdValidator("customerId"),
  invoiceController.getCustomerInvoices
);

/**
 * @swagger
 * /api/v1/invoices/{id}:
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
router.get(
  "/:id",
  protect,
  objectIdValidator("id"),
  invoiceController.getInvoice
);

/**
 * @swagger
 * /api/v1/invoices/{id}/download:
 *   get:
 *     summary: Download invoice PDF
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
 *         description: PDF file downloaded
 */
router.get(
  "/:id/download",
  protect,
  objectIdValidator("id"),
  invoiceController.downloadInvoice
);

/**
 * @swagger
 * /api/v1/invoices:
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
 *             type: object
 *             required:
 *               - customer
 *               - items
 *               - paymentMethod
 *             properties:
 *               customer:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product:
 *                       type: string
 *                     quantity:
 *                       type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, bank_transfer]
 *               discountCode:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invoice created successfully
 */
router.post(
  "/",
  protect,
  createInvoiceValidator,
  validateDiscountCode,
  invoiceController.createInvoice
);

/**
 * @swagger
 * /api/v1/invoices/{id}/payment-status:
 *   patch:
 *     summary: Update invoice payment status
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
 *               - paymentStatus
 *             properties:
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, paid, cancelled]
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 */
router.patch(
  "/:id/payment-status",
  protect,
  [objectIdValidator("id"), updatePaymentStatusValidator],
  invoiceController.updatePaymentStatus
);

/**
 * @swagger
 * /api/v1/invoices/{id}/qr:
 *   get:
 *     summary: Get payment QR code for an invoice
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
 *         description: QR code information retrieved successfully
 *       400:
 *         description: QR code not available for this payment method
 *       404:
 *         description: Invoice not found
 */
router.get(
  "/:id/qr",
  protect,
  objectIdValidator("id"),
  invoiceController.getPaymentQR
);
module.exports = router;
