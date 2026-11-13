const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// Body parser
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "EMS API is running",
  });
});

// Authentication routes
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const assetRoutes = require("./routes/assetRoutes");

const adminDashboardRoutes = require("./routes/adminDashboardRoutes");
const salarySlipRoutes = require("./routes/salarySlipRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/employee/attendance", attendanceRoutes);
app.use("/api/assets", assetRoutes);

app.use("/api/admin", adminDashboardRoutes);
app.use("/api/salary-slips", salarySlipRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("API Error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;
