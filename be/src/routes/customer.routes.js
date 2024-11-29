// src/routes/customer.routes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  createCustomerValidator,
  updateCustomerValidator,
} = require("../validators/customer.validator");
const {
  statusValidator,
  paginationValidator,
  sortValidator,
  searchValidator,
  objectIdValidator,
} = require("../validators/common.validator");
const customerController = require("../controllers/customer.controller");

/**
 * @swagger
 * components:
 *   schemas:
 *     Address:
 *       type: object
 *       properties:
 *         detail:
 *           type: string
 *           example: "123 Main Street"
 *         ward:
 *           type: string
 *           example: "Ward 1"
 *         district:
 *           type: string
 *           example: "District 1"
 *         province:
 *           type: string
 *           example: "Ho Chi Minh City"
 *
 *     Customer:
 *       type: object
 *       required:
 *         - name
 *         - phone
 *       properties:
 *         name:
 *           type: string
 *           example: "John Doe"
 *         phone:
 *           type: string
 *           example: "0123456789"
 *         email:
 *           type: string
 *           format: email
 *           example: "john@example.com"
 *         address:
 *           $ref: '#/components/schemas/Address'
 *         status:
 *           type: integer
 *           enum: [0, 1]
 *           default: 1
 *           description: "0=inactive, 1=active"
 *         notes:
 *           type: string
 *         purchaseHistory:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of invoice IDs
 */

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Customer management
 */

// Public routes
/**
 * @swagger
 * /api/v1/customers:
 *   get:
 *     summary: Get all customers
 *     tags: [Customers]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or phone
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
router.get(
  "/",
  protect,
  [paginationValidator, sortValidator, searchValidator],
  customerController.getCustomers
);

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
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
  customerController.getCustomer
);

/**
 * @swagger
 * /api/v1/customers/{id}/statistics:
 *   get:
 *     summary: Get customer statistics
 *     tags: [Customers]
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
  "/:id/statistics",
  protect,
  objectIdValidator("id"),
  customerController.getCustomerStatistics
);

/**
 * @swagger
 * /api/v1/customers:
 *   post:
 *     summary: Create new customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       201:
 *         description: Customer created successfully
 */
router.post(
  "/",
  protect,
  createCustomerValidator,
  customerController.createCustomer
);

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   put:
 *     summary: Update customer
 *     tags: [Customers]
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
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       200:
 *         description: Customer updated successfully
 */
router.put(
  "/:id",
  protect,
  [objectIdValidator("id"), updateCustomerValidator],
  customerController.updateCustomer
);

/**
 * @swagger
 * /api/v1/customers/{id}/status:
 *   patch:
 *     summary: Update customer status (Admin only)
 *     tags: [Customers]
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
  customerController.updateCustomerStatus
);

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   delete:
 *     summary: Delete customer (Admin only)
 *     tags: [Customers]
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
 *         description: Customer deleted successfully
 */
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  objectIdValidator("id"),
  customerController.deleteCustomer
);

module.exports = router;
