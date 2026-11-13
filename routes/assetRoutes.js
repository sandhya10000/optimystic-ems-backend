const express = require("express");
const router = express.Router();

const {
  createAsset,
  getAllAssets,
  updateAsset,
  assignAsset,
  returnAsset,
  deleteAsset,
} = require("../controllers/assetController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Admin-only routes
router.post("/", protect, authorizeRoles("admin"), createAsset);
router.get("/", protect, authorizeRoles("admin"), getAllAssets);
router.put("/:id", protect, authorizeRoles("admin"), updateAsset);
router.patch("/:id/assign", protect, authorizeRoles("admin"), assignAsset);
router.patch("/:id/return", protect, authorizeRoles("admin"), returnAsset);
router.delete("/:id", protect, authorizeRoles("admin"), deleteAsset);

module.exports = router;
