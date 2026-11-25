const mongoose = require("mongoose");

const User = require("../models/User");
const Counter = require("../models/Counter");
const { sendWelcomeEmail } = require("../config/mailer");
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
};

const createEmployeeLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check duplicate email
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Generate unique employee sequence atomically
    const counter = await Counter.findOneAndUpdate(
      { _id: "employeeId" },
      { $inc: { sequence: 1 } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    const employeeId = `EMP${String(counter.sequence).padStart(3, "0")}`;

    // Create employee account
    const user = await User.create({
      employeeId,
      firstName: "",
      lastName: "",
      email: normalizedEmail,
      password,
      role: "employee",
      profileCompleted: false,
      accountStatus: "approved",
    });

    return res.status(201).json({
      success: true,
      message: "Employee account created successfully.",
      user: {
        id: user._id,
        employeeId: user.employeeId,
        email: user.email,
        role: user.role,
        profileCompleted: user.profileCompleted,
      },
    });
  } catch (error) {
    console.error("Create Employee Login Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or Employee ID already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ==========================================
// GET MY BASIC PROFILE
// GET /api/employee/my-profile
// ==========================================

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Employee account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      profile: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// COMPLETE BASIC PROFILE
// PUT /api/employee-auth/complete-profile
// ==========================================

const completeBasicProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      gender,
      dateOfBirth,
      maritalStatus,
      address,
      city,
      state,
      pincode,
      emergencyContactName,
      emergencyContactNumber,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !phone ||
      !gender ||
      !dateOfBirth ||
      !address ||
      !city ||
      !state ||
      !pincode
    ) {
      return res.status(400).json({
        success: false,
        message: "Please complete all required profile fields.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user || user.role !== "employee") {
      return res.status(404).json({
        success: false,
        message: "Employee account not found.",
      });
    }

    user.firstName = firstName;
    user.lastName = lastName;
    user.phone = phone;
    user.gender = gender;
    user.dateOfBirth = dateOfBirth;
    user.maritalStatus = maritalStatus || "";
    user.address = address;
    user.city = city;
    user.state = state;
    user.pincode = pincode;
    user.emergencyContactName = emergencyContactName || "";
    user.emergencyContactNumber = emergencyContactNumber || "";

    user.profileCompleted = true;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Basic profile completed successfully.",
      profile: {
        id: user._id,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        profileCompleted: user.profileCompleted,
      },
    });
  } catch (error) {
    console.error("Complete Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const { employeeId } = req.params;

    console.log("Requested Employee ID:", employeeId);

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }

    const employee = await User.findOne({
      employeeId: employeeId,
    }).select("-password");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee fetched successfully",
      employee,
    });
  } catch (error) {
    console.error("Get Employee By ID Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch employee",
      error: error.message,
    });
  }
};

module.exports = {
  getEmployeeDashboard,
  createEmployeeLogin,
  completeBasicProfile,
  getMyProfile,
  getEmployeeById,
};
