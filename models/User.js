const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
      required: true,
    },

    lastName: {
      type: String,
      trim: true,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    employeeId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      required: true,
    },

    maritalStatus: {
      type: String,
      enum: ["single", "married", "other"],
      default: "single",
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    pincode: {
      type: String,
      required: true,
      trim: true,
    },

    emergencyContactName: {
      type: String,
      trim: true,
      default: "",
    },

    emergencyContactNumber: {
      type: String,
      trim: true,
      default: "",
    },

    password: {
      type: String,
      required: true,
      select: false,
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

    accountStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
