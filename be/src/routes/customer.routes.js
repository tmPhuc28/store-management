// src/routes/customer.routes.js
const express = require("express");
const router = express.Router();
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  updateCustomerStatus,
  deleteCustomer,
} = require("../controllers/customer.controller");
const { protect } = require("../middleware/auth");
const {
  createCustomerValidator,
  updateCustomerValidator,
} = require("../validators/customer.validator");

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Quản khách hàng
 */
/**
 * @swagger
 * /api/v1/customers:
 *   get:
 *     tags: [Customers]
 *     summary: Get all customers
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
 *         description: Results per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email or phone
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *         description: "Filter by status (0 = inactive, 1 = active)"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: "Sort field (prefix with - for descending)"
 *         example: "-createdAt"
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/", protect, getCustomers);

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   get:
 *     tags: [Customers]
 *     summary: Get single customer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: Customer not found
 */
router.get("/:id", protect, getCustomer);

/**
 * @swagger
 * /api/v1/customers:
 *   post:
 *     tags: [Customers]
 *     summary: Create new customer
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
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               address:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     detail:
 *                      type: string
 *                     ward:
 *                      type: string
 *                     district:
 *                      type: string
 *                     province:
 *                      type: string
 *               status:
 *                 type: number
 *                 enum: [0, 1]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: Validation error or duplicate phone/email
 */
router.post("/", protect, createCustomerValidator, createCustomer);

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   put:
 *     tags: [Customers]
 *     summary: Update customer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               address:
 *                 $ref: '#/components/schemas/Address'
 *               status:
 *                 type: number
 *                 enum: [0, 1]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *       404:
 *         description: Customer not found
 */
router.put("/:id", protect, updateCustomerValidator, updateCustomer);

/**
 * @swagger
 * /api/v1/customers/{id}/status:
 *   patch:
 *     tags: [Customers]
 *     summary: Update customer status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
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
 *         description: Status updated successfully
 *       404:
 *         description: Customer not found
 */
router.patch("/:id/status", protect, updateCustomerStatus);

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   delete:
 *     tags: [Customers]
 *     summary: Delete customer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer deleted successfully
 *       400:
 *         description: Cannot delete customer with purchase history
 *       404:
 *         description: Customer not found
 */
router.delete("/:id", protect, deleteCustomer);

module.exports = router;
