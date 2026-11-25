const express = require("express");
const router = express.Router();

const {
  getEmployeeDashboard,
  getAllEmployees,

  updateEmployee,
  getMyProfile,
  completeBasicProfile,
  createEmployeeLogin,
  getEmployeeById,
} = require("../controllers/employeeController");
const { getMyAssets } = require("../controllers/assetController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Dashboard API - Login required
router.get("/dashboard", protect, getEmployeeDashboard);

// Admin-only employee management APIs

// Employee's own assigned assets
router.get("/assets/my", protect, getMyAssets);

// Admin creates employee login
// api/employee/create
router.post(
  "/create",
  protect,
  authorizeRoles("super_admin", "hr_admin"),
  createEmployeeLogin,
);

// Employee gets own profile
// api/employee/my-profile
router.get("/my-profile", protect, authorizeRoles("employee"), getMyProfile);

// Employee completes basic profile
// api/employee/complete-profile
router.put(
  "/complete-profile",
  protect,
  authorizeRoles("employee"),
  completeBasicProfile,
);

//GET EMPLOYE DATA CREATED BY ADMIN
// api/employee/getEmployee/employeeId
router.get(
  "/getEmployee/:employeeId",
  protect,

  getEmployeeById,
);

module.exports = router;
