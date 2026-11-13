const express = require("express");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const {
  register,
  login,
  updateEmployeeApproval,
} = require("../controllers/authController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Login rate limiter

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});

// Employee registration

router.post("/register", register);

// Login

router.post("/login", loginLimiter, login);

// HR/Admin employee approval

router.patch(
  "/employees/:id/approval",
  protect,
  authorizeRoles("super_admin", "hr_admin"),
  updateEmployeeApproval,
);

module.exports = router;
