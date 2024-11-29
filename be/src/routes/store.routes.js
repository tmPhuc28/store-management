// src/routes/store.routes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const storeController = require("../controllers/store.controller");
const { updateStoreValidator } = require("../validators/store.validator");

/**
 * @swagger
 * components:
 *   schemas:
 *     Store:
 *       type: object
 *       required:
 *         - name
 *         - phone
 *         - address
 *         - bankAccount
 *         - bankName
 *         - accountName
 *       properties:
 *         name:
 *           type: string
 *           description: Store name
 *         phone:
 *           type: string
 *           description: Contact phone number
 *         email:
 *           type: string
 *           format: email
 *         address:
 *           type: object
 *           properties:
 *             detail:
 *               type: string
 *             ward:
 *               type: string
 *             district:
 *               type: string
 *             province:
 *               type: string
 *         taxCode:
 *           type: string
 *         bankAccount:
 *           type: string
 *         bankName:
 *           type: string
 *         accountName:
 *           type: string
 */

/**
 * @swagger
 * tags:
 *   name: Store
 *   description: Store information management
 */

/**
 * @swagger
 * /api/v1/store:
 *   get:
 *     summary: Get store information
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Store'
 */
router.get("/", protect, storeController.getStoreInfo);

/**
 * @swagger
 * /api/v1/store:
 *   post:
 *     summary: Create new store (Admin)
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Store'
 *     responses:
 *       201:
 *         description: Store created successfully
 */
router.post(
  "/",
  protect,
  authorize("admin"),
  updateStoreValidator,
  storeController.createStore
);

/**
 * @swagger
 * /api/v1/store:
 *   put:
 *     summary: Update store information (Admin)
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Store'
 *     responses:
 *       200:
 *         description: Updated successfully
 */
router.put(
  "/",
  protect,
  authorize("admin"),
  updateStoreValidator,
  storeController.updateStore
);

module.exports = router;
