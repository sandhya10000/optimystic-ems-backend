const express = require("express");
const router = express.Router();

const {
  getEmployeeDashboard,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
} = require("../controllers/employeeController");
const { getMyAssets } = require("../controllers/assetController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Dashboard API - Login required
router.get("/dashboard", protect, getEmployeeDashboard);

// Admin-only employee management APIs

// Employee's own assigned assets
router.get("/assets/my", protect, getMyAssets);
module.exports = router;
