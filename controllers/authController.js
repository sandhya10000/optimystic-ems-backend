const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
// --------------------------------------------------
// GENERATE JWT TOKEN
// --------------------------------------------------
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    },
  );
};

// --------------------------------------------------
// SAFE USER RESPONSE
// --------------------------------------------------
const getSafeUser = (user) => ({
  _id: user._id?.toString() || "",
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  email: user.email || "",
  phone: user.phone || "",
  employeeId: user.employeeId || "",
  role: user.role || "",
  accountStatus: user.accountStatus || "",
});

// --------------------------------------------------
// EMPLOYEE REGISTRATION
// POST /api/auth/register
// --------------------------------------------------

exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      employeeId,
      dateOfBirth,
      gender,
      maritalStatus,
      address,
      city,
      state,
      pincode,
      emergencyContactName,
      emergencyContactNumber,
      password,
    } = req.body;

    // Required fields

    const requiredFields = {
      firstName,
      lastName,
      email,
      phone,
      employeeId,
      dateOfBirth,
      gender,
      address,
      city,
      state,
      pincode,
      password,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => typeof value !== "string" || !value.trim())
      .map(([key]) => key);

    if (missingFields.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedEmployeeId = employeeId.trim().toUpperCase();

    // Validate email

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address.",
      });
    }

    // Validate phone

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number.",
      });
    }

    // Validate password

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    // Validate PIN code

    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid PIN code.",
      });
    }

    if (
      emergencyContactNumber &&
      !/^[6-9]\d{9}$/.test(emergencyContactNumber)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid emergency contact number.",
      });
    }

    const dob = new Date(dateOfBirth);

    if (
      Number.isNaN(dob.getTime()) ||
      dob >= new Date() ||
      dob.getFullYear() < 1900
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date of birth.",
      });
    }

    // Check duplicate records

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { phone },
        { employeeId: normalizedEmployeeId },
      ],
    });

    if (existingUser) {
      let message = "User already exists.";

      if (existingUser.email === normalizedEmail) {
        message = "Email address is already registered.";
      } else if (existingUser.phone === phone) {
        message = "Mobile number is already registered.";
      } else if (existingUser.employeeId === normalizedEmployeeId) {
        message = "Employee ID is already registered.";
      }

      return res.status(409).json({
        success: false,
        message,
      });
    }

    // Hash password

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create employee

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone,
      employeeId: normalizedEmployeeId,
      dateOfBirth: dob,
      gender,
      maritalStatus: maritalStatus || "single",
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode,
      emergencyContactName,
      emergencyContactNumber,
      password: hashedPassword,

      // Never accept role or approval status from frontend.
      role: "employee",
      accountStatus: "pending",
    });

    return res.status(201).json({
      success: true,
      message:
        "Registration submitted successfully. Please wait for HR approval.",
      user: getSafeUser(user),
    });
  } catch (error) {
    console.error("Registration Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email, mobile number or employee ID already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
    });
  }
};

// --------------------------------------------------
// LOGIN
// POST /api/auth/login
// --------------------------------------------------

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter email and password.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Verify password

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Check approval

    // if (user.accountStatus === "pending") {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Your account is pending HR approval.",
    //   });
    // }

    // if (user.accountStatus === "rejected") {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Your registration has been rejected. Please contact HR.",
    //   });
    // }

    // Generate JWT

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: getSafeUser(user),
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please enter your registered email.",
      });
    }

    const user = await User.findOne({ email });

    // Generic response prevents email enumeration.
    const responseMessage =
      "If an account exists with this email, a password reset link has been sent.";

    if (!user) {
      return res.status(200).json({
        success: true,
        message: responseMessage,
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store only the hashed token in database
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Token expires in 15 minutes
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Frontend reset URL
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #ddd; border-radius: 10px;">

        <h2 style="color: #0e8278;">
          Password Reset Request
        </h2>

        <p>Hello ${user.firstName || "User"},</p>

        <p>
          We received a request to reset your Employee Management
          account password.
        </p>

        <p>
          Click the button below to create a new password.
        </p>

        <a href="${resetUrl}"
          style="
            display: inline-block;
            padding: 12px 25px;
            background: #0e8278;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
          ">
          Reset Password
        </a>

        <p style="margin-top: 20px;">
          This link will expire in 15 minutes.
        </p>

        <p>
          If you did not request this password reset,
          you can safely ignore this email.
        </p>

        <hr />

        <p style="color: #777; font-size: 12px;">
          Employee Management System
        </p>

      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset Request - Employee Management",
        html,
      });
    } catch (emailError) {
      // Remove token if email sending fails
      user.resetPasswordToken = null;
      user.resetPasswordExpire = null;

      await user.save({ validateBeforeSave: false });

      throw emailError;
    }

    return res.status(200).json({
      success: true,
      message: responseMessage,
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process password reset request.",
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required.",
      });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please enter and confirm your new password.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    // Hash incoming token to compare with database
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid, non-expired token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpire");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset link.",
      });
    }

    // Hash new password
    user.password = await bcrypt.hash(password, 12);

    // Invalidate reset token
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. Please login with your new password.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reset password. Please try again.",
    });
  }
};

// --------------------------------------------------
// HR / ADMIN APPROVE OR REJECT EMPLOYEE
// PATCH /api/auth/employees/:id/approval
// --------------------------------------------------

exports.updateEmployeeApproval = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected.",
      });
    }

    const employee = await User.findById(req.params.id);

    if (!employee || employee.role !== "employee") {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    if (employee.accountStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This employee registration has already been processed.",
      });
    }

    employee.accountStatus = status;

    employee.approvedBy = req.user._id;
    employee.approvedAt = new Date();

    await employee.save();

    return res.status(200).json({
      success: true,
      message: `Employee ${status} successfully.`,
      user: getSafeUser(employee),
    });
  } catch (error) {
    console.error("Employee Approval Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update employee approval.",
    });
  }
};
