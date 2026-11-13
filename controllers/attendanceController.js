const Attendance = require("../models/Attendance");
const getClientIp = require("../utils/getClientIp");

// Current date in India
const getTodayDate = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

// Allowed office IPs
const getOfficeIps = () => {
  return (process.env.OFFICE_PUBLIC_IPS || process.env.OFFICE_PUBLIC_IP || "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
};

// Check office IP
const isOfficeIp = (ip) => {
  const allowedIps = getOfficeIps();
  return allowedIps.includes(ip);
};

// CHECK IN

exports.checkIn = async (req, res) => {
  try {
    const employeeId = req.user?._id || req.user?.id;

    if (!employeeId) {
      return res.status(401).json({
        success: false,
        message: "Employee authentication required",
      });
    }

    const clientIp = getClientIp(req);

    // Office IP = WFO, Other IP = WFH
    const attendanceType = isOfficeIp(clientIp) ? "WFO" : "WFH";

    const today = getTodayDate();

    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    });

    if (existingAttendance?.checkIn) {
      return res.status(400).json({
        success: false,
        message: "You have already checked in today.",
      });
    }

    const attendance = await Attendance.findOneAndUpdate(
      {
        employee: employeeId,
        date: today,
      },
      {
        $set: {
          checkIn: new Date(),
          checkInIp: clientIp,
          attendanceType,
          status: "Present",
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: `Check In successful (${attendanceType})`,
      attendance,
    });
  } catch (error) {
    console.error("Check In Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to check in",
    });
  }
};

// CHECK OUT
exports.checkOut = async (req, res) => {
  try {
    const employeeId = req.user?._id || req.user?.id;

    if (!employeeId) {
      return res.status(401).json({
        success: false,
        message: "Employee authentication required",
      });
    }

    const clientIp = getClientIp(req);

    // Checkout bhi office network se hi allow hoga
    if (!isOfficeIp(clientIp)) {
      return res.status(403).json({
        success: false,
        message: "Check Out is allowed only from office network.",
        yourIp: clientIp,
      });
    }

    const today = getTodayDate();

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    });

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({
        success: false,
        message: "Please check in first.",
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        message: "You have already checked out today.",
      });
    }

    attendance.checkOut = new Date();
    attendance.checkOutIp = clientIp;

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Check Out successful",
      attendance,
    });
  } catch (error) {
    console.error("Check Out Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to check out",
    });
  }
};

// TODAY ATTENDANCE
exports.getTodayAttendance = async (req, res) => {
  try {
    const employeeId = req.user?._id || req.user?.id;
    const today = getTodayDate();

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    });

    return res.status(200).json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error("Today Attendance Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch today's attendance",
    });
  }
};

// MONTHLY ATTENDANCE
exports.getMyAttendance = async (req, res) => {
  try {
    const employeeId = req.user?._id || req.user?.id;
    const { month } = req.query;

    const selectedMonth = month || getTodayDate().slice(0, 7);

    if (!/^\d{4}-\d{2}$/.test(selectedMonth)) {
      return res.status(400).json({
        success: false,
        message: "Invalid month. Use YYYY-MM format.",
      });
    }

    const attendance = await Attendance.find({
      employee: employeeId,
      date: {
        $regex: `^${selectedMonth}`,
      },
    }).sort({ date: -1 });

    return res.status(200).json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error("Monthly Attendance Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch attendance history",
    });
  }
};
