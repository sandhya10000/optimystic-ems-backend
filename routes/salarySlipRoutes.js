const express = require("express");
const router = express.Router();

const {
  generateSalarySlip,
  getAllSalarySlips,
  getSalarySlipById,
  downloadSalarySlipPDF,
  updateSalarySlip,
} = require("../controllers/salarySlipController");

// Replace these imports with your existing authentication middleware.
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// api/salary-slips/generate
router.post(
  "/generate",
  protect,
  authorizeRoles("super_admin"),
  generateSalarySlip,
);

router.get("/", protect, getAllSalarySlips);

router.get("/:id/pdf", protect, downloadSalarySlipPDF);

router.get("/:id", protect, getSalarySlipById);

router.put("/:id", protect, authorizeRoles("super_admin"), updateSalarySlip);

module.exports = router;
