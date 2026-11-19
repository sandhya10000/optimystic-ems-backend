const express = require("express");
const router = express.Router();

const {
  verifyPAN,
  getPANHistory,
  generateDigilockerLink,
} = require("../controllers/kycController");

const { protect } = require("../middleware/authMiddleware");

// PAN Verification
// api/kyc/pan/verify
router.post("/pan/verify", protect, verifyPAN);

// PAN History
// api/kyc/pan/history
router.get("/pan/history", protect, getPANHistory);

// Generate DigiLocker KYC Link
// /kyc/digilocker/generate-link
router.post("/digilocker/generate-link", protect, generateDigilockerLink);

module.exports = router;
