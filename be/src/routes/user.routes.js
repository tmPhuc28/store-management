// src/routes/user.routes.js
const express = require("express");
const router = express.Router();
const {
  getUsers,
  getUser,
  updateUser,
  updateUserStatus,
  deleteUser,
} = require("../controllers/user.controller");
const { protect, authorize } = require("../middleware/auth");
const {
  updateUserValidator,
  validateUserUpdate,
} = require("../validators/user.validator");
const {
  statusValidator,
  paginationValidator,
  objectIdValidator,
  sortValidator,
  searchValidator,
} = require("../validators/common.validator");
/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get(
  "/",
  protect,
  authorize("admin"),
  paginationValidator,
  sortValidator,
  searchValidator,
  getUsers
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin)
 *     tags: [Users]
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
 *         description: User retrieved successfully
 */
router.get("/:id", protect, authorize("admin"), objectIdValidator(), getUser);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update user (Admin)
 *     tags: [Users]
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
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
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
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.put(
  "/:id",
  protect,
  authorize("admin"),
  objectIdValidator(),
  updateUserValidator,
  validateUserUpdate, // Custom middleware for sensitive fields
  updateUser
);

/**
 * @swagger
 * /api/v1/users/{id}/status:
 *   patch:
 *     summary: Update user status (Admin)
 *     tags: [Users]
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
 *         description: User status updated successfully
 */
router.patch(
  "/:id/status",
  protect,
  authorize("admin"),
  objectIdValidator(),
  statusValidator,
  updateUserStatus
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete user (Admin)
 *     tags: [Users]
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
 *         description: User deleted successfully
 */
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  objectIdValidator(),
  deleteUser
);

module.exports = router;
