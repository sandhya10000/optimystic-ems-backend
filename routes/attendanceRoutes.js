const express = require("express");
const router = express.Router();

const {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
} = require("../controllers/attendanceController");

// Apne existing authentication middleware ka path/name use karein
const { protect } = require("../middleware/authMiddleware");

router.post("/check-in", protect, checkIn);
router.post("/check-out", protect, checkOut);

router.get("/today", protect, getTodayAttendance);
router.get("/my", protect, getMyAttendance);

module.exports = router;
