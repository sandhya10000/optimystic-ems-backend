const mongoose = require("mongoose");

const User = require("../models/User");

// ========================================
// GET EMPLOYEE DASHBOARD
// GET /api/employee/dashboard
// ========================================

const getEmployeeDashboard = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
    }

    const employee = await User.findById(userId).select(
      "firstName lastName name username email role employeeId department designation",
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully.",
      data: {
        employee: {
          firstName: employee.firstName || "",
          lastName: employee.lastName || "",
          name:
            employee.name ||
            `${employee.firstName || ""} ${employee.lastName || ""}`.trim(),
          username: employee.username || "",
          email: employee.email || "",
          role: employee.role || "employee",
          employeeId: employee.employeeId || "",
          department: employee.department || "",
          designation: employee.designation || "",
        },
      },
    });
  } catch (error) {
    console.error("Employee Dashboard Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch dashboard data.",
    });
  }
}; // controllers/employeeController.js

module.exports = {
  getEmployeeDashboard,
};
