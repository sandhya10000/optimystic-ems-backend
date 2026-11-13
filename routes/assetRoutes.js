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
router.post("/", protect, authorizeRoles("super_admin"), createAsset);
router.get("/", protect, authorizeRoles("super_admin"), getAllAssets);
router.put("/:id", protect, authorizeRoles("super_admin"), updateAsset);
router.patch(
  "/:id/assign",
  protect,
  authorizeRoles("super_admin"),
  assignAsset,
);
router.patch(
  "/:id/return",
  protect,
  authorizeRoles("super_admin"),
  returnAsset,
);
router.delete("/:id", protect, authorizeRoles("super_admin"), deleteAsset);

module.exports = router;
