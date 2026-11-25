const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
      default: "",
    },

    lastName: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Password will be created when Admin creates employee login
    password: {
      type: String,
      required: false,
      select: false,
    },

    // Existing Employee collection reference
    employeeRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      unique: true,
      sparse: true,
    },

    employeeId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    phone: {
      type: String,
      default: "",
    },

    gender: {
      type: String,
      default: "",
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    maritalStatus: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
    },

    state: {
      type: String,
      default: "",
    },

    pincode: {
      type: String,
      default: "",
    },

    emergencyContactName: {
      type: String,
      default: "",
    },

    emergencyContactNumber: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      enum: [
        "employee",
        "super_admin",
        "hr_admin",
        "finance_payroll",
        "manager",
      ],
      default: "employee",
    },

    profileCompleted: {
      type: Boolean,
      default: false,
    },

    accountStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
  },
  { timestamps: true },
);

// Password hashing
userSchema.pre("save", async function () {
  // Password modified nahi hua toh return
  if (!this.isModified("password")) {
    return;
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model("User", userSchema);
