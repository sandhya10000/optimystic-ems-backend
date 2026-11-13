const express = require("express");
const router = express.Router();

const {
  getAdminDashboard,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
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

module.exports = router;
