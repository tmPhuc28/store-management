// store.routes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const storeController = require("../controllers/store.controller");
const {
  updateStoreValidator,
  validateBankInfo,
} = require("../validators/store.validator");

router.get("/", protect, storeController.getStore);
router.put(
  "/",
  protect,
  authorize("admin"),
  updateStoreValidator,
  storeController.updateStore
);

router.get("/bank-info", protect, storeController.getStoreBankInfo);
router.put(
  "/bank-info",
  protect,
  authorize("admin"),
  validateBankInfo,
  storeController.updateBankInfo
);

module.exports = router;
