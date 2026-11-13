const mongoose = require("mongoose");

const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Asset = require("../models/Asset");
const SalarySlip = require("../models/SalarySlip");

// --------------------------------------------------
// ADMIN DASHBOARD
// GET /api/admin/dashboard
// --------------------------------------------------

const getAdminDashboard = async (req, res) => {
  try {
    // Current date in India
    const now = new Date();

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const currentMonth = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      month: "long",
    }).format(now);

    const currentYear = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
      }).format(now),
    );

    // Change this role if your User model uses another employee role
    const employeeFilter = {
      role: "employee",
    };

    const activeEmployeeFilter = {
      ...employeeFilter,
      employmentStatus: "Active",
    };

    // --------------------------------------------------
    // 1. EMPLOYEE STATISTICS
    // --------------------------------------------------

    const [
      totalEmployees,
      activeEmployees,
      pendingKyc,
      recentEmployees,
      departments,
      newEmployeesThisMonth,
    ] = await Promise.all([
      User.countDocuments(employeeFilter),

      User.countDocuments(activeEmployeeFilter),

      User.countDocuments({
        ...employeeFilter,
        kycStatus: "pending",
      }),

      User.find(employeeFilter)
        .select(
          "name firstName lastName email employeeId department employmentStatus",
        )
        .sort({ createdAt: -1 })
        .limit(4)
        .lean(),

      User.distinct("department", {
        ...employeeFilter,
        department: { $exists: true, $nin: ["", null] },
      }),

      User.countDocuments({
        ...employeeFilter,
        createdAt: {
          $gte: new Date(currentYear, now.getMonth(), 1),
          $lt: new Date(currentYear, now.getMonth() + 1, 1),
        },
      }),
    ]);

    // --------------------------------------------------
    // 2. TODAY'S ATTENDANCE
    // --------------------------------------------------

    const [presentEmployees, absentEmployees, wfhEmployees] = await Promise.all(
      [
        Attendance.countDocuments({
          date: today,
          status: "Present",
        }),

        Attendance.countDocuments({
          date: today,
          status: "Absent",
        }),

        Attendance.countDocuments({
          date: today,
          attendanceType: "WFH",
          status: "Present",
        }),
      ],
    );

    const attendanceRate =
      activeEmployees > 0
        ? Number(((presentEmployees / activeEmployees) * 100).toFixed(1))
        : 0;

    // --------------------------------------------------
    // 3. SALARY SLIP PROCESSING
    // --------------------------------------------------

    const generatedSalaryEmployeeIds = await SalarySlip.distinct("employee", {
      month: currentMonth,
      year: currentYear,
    });

    const salarySlipsToGenerate = await User.countDocuments({
      ...activeEmployeeFilter,
      _id: {
        $nin: generatedSalaryEmployeeIds,
      },
    });

    // --------------------------------------------------
    // 4. ASSET STATISTICS
    // --------------------------------------------------

    const [totalAssets, unassignedAssets] = await Promise.all([
      Asset.countDocuments(),

      Asset.countDocuments({
        status: "Available",
      }),
    ]);

    // --------------------------------------------------
    // 5. ON LEAVE TODAY
    // --------------------------------------------------
    // This requires a Leave model or an attendance status
    // that supports "On Leave". Your current Attendance
    // schema does not include that status.
    // Return null until leave management is implemented.

    const onLeaveToday = null;

    // --------------------------------------------------
    // 6. RESPONSE
    // --------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Admin dashboard data fetched successfully",

      dashboard: {
        stats: {
          totalEmployees,
          activeEmployees,
          pendingKyc,

          todayAttendance: {
            present: presentEmployees,
            absent: absentEmployees,
            wfh: wfhEmployees,
            attendanceRate,
          },
        },

        attendanceOverview: {
          present: presentEmployees,
          absent: absentEmployees,
          workFromHome: wfhEmployees,
          onLeave: onLeaveToday,
        },

        recentEmployees: recentEmployees.map((employee) => ({
          _id: employee._id,
          name:
            employee.name ||
            `${employee.firstName || ""} ${employee.lastName || ""}`.trim(),
          email: employee.email,
          employeeId: employee.employeeId,
          department: employee.department,
          status: employee.employmentStatus || "N/A",
        })),

        pendingTasks: {
          pendingKyc,
          salarySlipsToGenerate,
          unassignedAssets,
        },

        organizationSummary: {
          totalDepartments: departments.length,
          totalAssets,
          onLeaveToday,
          newEmployeesThisMonth,
        },
      },
    });
  } catch (error) {
    console.error("Admin Dashboard Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch admin dashboard data",
      error: error.message,
    });
  }
};
// --------------------------------------------------
// GET ALL EMPLOYEES
// GET /api/admin
// --------------------------------------------------

const getAllEmployees = async (req, res) => {
  try {
    const { search = "", department = "", status = "" } = req.query;

    // Employee role filter
    const filter = {
      role: "employee",
    };

    if (department && department !== "All") {
      filter.department = department;
    }

    if (status) {
      filter.employmentStatus = status;
    }

    if (search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
        { employeeCode: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const employees = await User.find(filter)
      .select("-password -refreshToken -resetPasswordToken")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Employees fetched successfully.",
      count: employees.length,
      employees,
    });
  } catch (error) {
    console.error("Get Employees Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch employees.",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// GET SINGLE EMPLOYEE
// GET /api/admin/:id
// --------------------------------------------------

const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID.",
      });
    }

    const employee = await User.findOne({
      _id: id,
      role: "employee",
    })
      .select("-password -refreshToken -resetPasswordToken")
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee profile fetched successfully.",
      employee,
    });
  } catch (error) {
    console.error("Get Employee Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch employee profile.",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// UPDATE EMPLOYEE
// PUT /api/admin/:id
// --------------------------------------------------

const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID.",
      });
    }

    const {
      name,
      email,
      phone,
      gender,
      dob,
      address,
      emergencyContact,
      department,
      designation,
      joiningDate,
      employmentType,
      reportingManager,
      salary,
      employmentStatus,
    } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required.",
      });
    }

    // Only permitted profile fields can be updated.
    // role, password and other authentication fields are excluded.
    const updateData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone,
      gender,
      dob,
      address,
      emergencyContact,
      department,
      designation,
      joiningDate,
      employmentType,
      reportingManager,
      employmentStatus,
    };

    if (salary !== undefined && salary !== "") {
      const parsedSalary = Number(salary);

      if (!Number.isFinite(parsedSalary) || parsedSalary < 0) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid salary.",
        });
      }

      updateData.salary = parsedSalary;
    }

    // Check whether another user already uses this email.
    const existingEmail = await User.findOne({
      email: updateData.email,
      _id: { $ne: id },
    }).select("_id");

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "This email address is already in use.",
      });
    }

    const employee = await User.findOneAndUpdate(
      {
        _id: id,
        role: "employee",
      },
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      },
    ).select("-password -refreshToken -resetPasswordToken");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee profile updated successfully.",
      employee,
    });
  } catch (error) {
    console.error("Update Employee Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or another unique field already exists.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update employee profile.",
      error: error.message,
    });
  }
};
// GET ALL ATTENDANCE - ADMIN

const getAllAttendance = async (req, res) => {
  try {
    const { date, employee, status, attendanceType } = req.query;

    const filter = {};

    if (date) filter.date = date;
    if (employee) filter.employee = employee;
    if (status) filter.status = status;
    if (attendanceType) filter.attendanceType = attendanceType;

    const attendance = await Attendance.find(filter)
      .populate("employee")
      .sort({ date: -1, checkIn: -1 });

    console.log("Attendance Records:", attendance);

    return res.status(200).json({
      success: true,
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    console.error("Get All Attendance Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch attendance records",
      error: error.message,
    });
  }
};

module.exports = {
  getAdminDashboard,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  getAllAttendance,
};
