// src/routes/bank.routes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const bankController = require("../controllers/bank.controller");
const { validateBankInfo } = require("../validators/bank.validator");

/**
 * @swagger
 * /api/v2/banks:
 *   get:
 *     summary: Get list of supported banks
 *     tags: [Banks]
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
router.get("/", protect, bankController.getBanks);

/**
 * @swagger
 * /api/v2/banks/find:
 *   get:
 *     summary: Find a bank by BIN, code, or short name
 *     tags: [Banks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: BIN, code, or short name of the bank.
 *     responses:
 *       200:
 *         description: Bank found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     bin:
 *                       type: string
 *                       example: "970422"
 *                     code:
 *                       type: string
 *                       example: "VCB"
 *                     name:
 *                       type: string
 *                       example: "Vietcombank"
 *                     short_name:
 *                       type: string
 *                       example: "VCB"
 *                     swift_code:
 *                       type: string
 *                       example: "BFTVVNVX"
 *                     logo:
 *                       type: string
 *                       example: "https://example.com/logo.png"
 *       400:
 *         description: Invalid input or missing identifier
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Identifier is required."
 *       403:
 *         description: Unauthorized access (admin role required)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "You do not have permission to access this resource."
 *       404:
 *         description: Bank not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Bank not found."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal server error."
 */
router.get("/find", protect, bankController.findBank);

/**
 * @swagger
 * /api/v2/banks/qr:
 *   post:
 *     summary: Generate VietQR code
 *     tags: [Banks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bankInfo
 *               - amount
 *             properties:
 *               bankInfo:
 *                 type: object
 *                 required:
 *                   - bankId
 *                   - accountNumber
 *                 properties:
 *                   bankId:
 *                     type: string
 *                   accountNumber:
 *                     type: string
 *                   accountName:
 *                     type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: QR code generated successfully
 */
router.post("/qr", protect, validateBankInfo, bankController.generateQR);

module.exports = router;
