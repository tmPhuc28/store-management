// src/routes/store.routes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const storeController = require("../controllers/store.controller");
const { updateStoreValidator } = require("../validators/store.validator");
const { getBankList } = require("../utils/bankValidator");

/**
 * @swagger
 * components:
 *   schemas:
 *     BankInfo:
 *       type: object
 *       required:
 *         - bankId
 *         - accountNumber
 *         - accountName
 *       properties:
 *         bankId:
 *           type: string
 *           description: Bank ID or code from VietQR system
 *         accountNumber:
 *           type: string
 *           description: Bank account number
 *         accountName:
 *           type: string
 *           description: Account holder name
 *         template:
 *           type: string
 *           enum: [compact, compact2, qr_only, print]
 *           default: compact2
 *           description: VietQR template type
 */

/**
 * @swagger
 * /api/v1/store/banks:
 *   get:
 *     summary: Get list of supported banks
 *     tags: [Store]
 *     parameters:
 *       - in: query
 *         name: onlySupported
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Only return banks that support VietQR
 *     responses:
 *       200:
 *         description: List of banks retrieved successfully
 */
router.get("/banks", (req, res) => {
  const onlySupported = req.query.onlySupported !== "false";
  const banks = getBankList(onlySupported);
  res.json({
    success: true,
    count: banks.length,
    data: banks,
  });
});

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
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: object
 *                 properties:
 *                   detail:
 *                     type: string
 *                   ward:
 *                     type: string
 *                   district:
 *                     type: string
 *                   province:
 *                     type: string
 *               bankInfo:
 *                 $ref: '#/components/schemas/BankInfo'
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
