const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },

    checkIn: {
      type: Date,
      default: null,
    },

    checkOut: {
      type: Date,
      default: null,
    },

    attendanceType: {
      type: String,
      enum: ["WFO", "WFH"],
      default: "WFO",
    },

    status: {
      type: String,
      enum: ["Present", "Absent", "Half Day"],
      default: "Present",
    },

    checkInIp: {
      type: String,
      default: null,
    },

    checkOutIp: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

// Same employee ki same date par duplicate attendance nahi banegi
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
