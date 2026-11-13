const express = require("express");
const router = express.Router();

const {
  getAdminDashboard,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  getAllAttendance,
} = require("../controllers/adminDashboardController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.get(
  "/dashboard",
  protect,
  authorizeRoles("super_admin", "hr_admin", "finance_payroll", "manager"),
  getAdminDashboard,
);
// api/admin/getAllEmployees
router.get(
  "/getAllEmployees",
  protect,
  authorizeRoles("super_admin", "hr_admin", "finance_payroll", "manager"),
  getAllEmployees,
);

// api/admin/getEmployeeBy/:id
router.get(
  "/getEmployeeBy/:id",
  protect,
  authorizeRoles("super_admin", "hr_admin", "finance_payroll", "manager"),
  getEmployeeById,
);

// api/admin/updateEmployee/:id
router.put(
  "/updateEmployee/:id",
  protect,
  authorizeRoles("super_admin", "hr_admin", "finance_payroll", "manager"),
  updateEmployee,
);
// GET  /api/admin/attendance/getAllAttendance
router.get(
  "/attendance/getAllAttendance",
  (req, res, next) => {
    console.log("1. Attendance route reached");
    next();
  },
  protect,
  (req, res, next) => {
    console.log("2. Authentication passed");
    console.log("User:", req.user);
    next();
  },

  getAllAttendance,
);

module.exports = router;
