const express = require("express");
const router = express.Router();

const {
  verifyPAN,
  getPANHistory,
  generateDigilockerLink,
  getAllPANVerifications,
  getAllDigilockerVerifications,
} = require("../controllers/kycController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// PAN Verification
// api/kyc/pan/verify
router.post("/pan/verify", protect, verifyPAN);

// PAN History
// api/kyc/pan/history
router.get("/pan/history", protect, getPANHistory);

// Generate DigiLocker KYC Link
// /kyc/digilocker/generate-link
router.post("/digilocker/generate-link", protect, generateDigilockerLink);

// GET All Employees PAN data
// /api/kyc/admin/getallPan
router.get(
  "/admin/getAllpan",
  protect,
  authorizeRoles("super_admin"),
  getAllPANVerifications,
);

// Admin - All Employees DigiLocker Records
// /api/kyc/admin/getAlldigilocker
router.get(
  "/admin/getAlldigilocker",
  protect,
  authorizeRoles("super_admin"),
  getAllDigilockerVerifications,
);

module.exports = router;
