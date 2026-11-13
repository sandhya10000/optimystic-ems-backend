const mongoose = require("mongoose");

const salarySlipSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    employeeId: {
      type: String,
      required: true,
    },

    month: {
      type: String,
      required: true,
    },

    year: {
      type: Number,
      required: true,
    },

    basicSalary: {
      type: Number,
      required: true,
    },

    allowances: {
      type: Number,
      default: 0,
    },

    deductions: {
      type: Number,
      default: 0,
    },

    netSalary: {
      type: Number,
      required: true,
    },

    paymentDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },

    pdfUrl: {
      type: String,
      default: "",
    },

    pdfPath: {
      type: String,
      default: "",
    },

    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// One salary slip per employee per month
salarySlipSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("SalarySlip", salarySlipSchema);
