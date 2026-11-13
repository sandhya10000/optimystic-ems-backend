const User = require("../models/User");
const SalarySlip = require("../models/SalarySlip");
const Employee = require("../models/Employee");

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const generateSalarySlipHTML = require("../templates/salarySlip.template");

// ======================================================
// GENERATE SALARY SLIP PDF
// POST /api/salary-slips/generate
// ======================================================

exports.generateSalarySlip = async (req, res) => {
  let browser;

  try {
    const { employee, basicSalary, allowances = 0, deductions = 0 } = req.body;

    // ---------------------------------------
    // 1. VALIDATION
    // ---------------------------------------

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: "Please select an employee.",
      });
    }

    if (
      basicSalary === undefined ||
      basicSalary === null ||
      basicSalary === "" ||
      !Number.isFinite(Number(basicSalary)) ||
      Number(basicSalary) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid basic salary.",
      });
    }

    if (
      !Number.isFinite(Number(allowances)) ||
      !Number.isFinite(Number(deductions)) ||
      Number(allowances) < 0 ||
      Number(deductions) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid allowances or deductions.",
      });
    }

    // ---------------------------------------
    // 2. FIND EMPLOYEE FROM USER MODEL
    // ---------------------------------------

    const employeeData = await User.findOne({
      _id: employee,
      role: "employee",
    });

    if (!employeeData) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    // ---------------------------------------
    // 3. EMPLOYEE DETAILS
    // ---------------------------------------

    const employeeId =
      employeeData.employeeId ||
      employeeData.userId ||
      String(employeeData._id);

    const employeeName =
      employeeData.name ||
      employeeData.fullName ||
      `${employeeData.firstName || ""} ${employeeData.lastName || ""}`.trim() ||
      "Employee";

    // ---------------------------------------
    // 4. CURRENT DATE AND MONTH
    // ---------------------------------------

    const now = new Date();

    const month = new Intl.DateTimeFormat("en-IN", {
      month: "long",
      timeZone: "Asia/Kolkata",
    }).format(now);

    const year = Number(
      new Intl.DateTimeFormat("en-IN", {
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(now),
    );

    const dateParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const paymentDate = new Date(`${dateParts}T00:00:00+05:30`);

    const dateString = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(now);

    // ---------------------------------------
    // 5. PREVENT DUPLICATE SALARY SLIP
    // ---------------------------------------

    const existingSlip = await SalarySlip.findOne({
      employee: employeeData._id,
      month,
      year,
    });

    if (existingSlip) {
      return res.status(409).json({
        success: false,
        message: "Salary slip already exists for this employee and month.",
        salarySlip: existingSlip,
      });
    }

    // ---------------------------------------
    // 6. SALARY CALCULATION
    // ---------------------------------------

    const basic = Number(basicSalary);
    const allowance = Number(allowances);
    const deduction = Number(deductions);

    const netSalary = basic + allowance - deduction;

    if (netSalary < 0) {
      return res.status(400).json({
        success: false,
        message: "Deductions cannot exceed total earnings.",
      });
    }

    // ---------------------------------------
    // 7. GENERATE SALARY SLIP HTML
    // ---------------------------------------

    const html = generateSalarySlipHTML({
      employeeName,
      employeeId,

      designation: employeeData.designation || employeeData.position || "",

      department: employeeData.department || "",
      email: employeeData.email || "",

      month,
      year,
      paymentDate: dateString,

      basicSalary: basic,
      allowances: allowance,
      deductions: deduction,
      netSalary,
    });

    // ---------------------------------------
    // 8. CREATE PDF DIRECTORY
    // ---------------------------------------

    const uploadDir = path.join(process.cwd(), "uploads", "salary-slips");

    fs.mkdirSync(uploadDir, {
      recursive: true,
    });

    const safeEmployeeId = String(employeeId).replace(/[^a-zA-Z0-9_-]/g, "_");

    const fileName = `SalarySlip_${safeEmployeeId}_${month}_${year}.pdf`;

    const pdfPath = path.join(uploadDir, fileName);

    // ---------------------------------------
    // 9. GENERATE PDF
    // ---------------------------------------

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "15mm",
        bottom: "15mm",
        left: "12mm",
        right: "12mm",
      },
    });

    await browser.close();
    browser = null;

    // ---------------------------------------
    // 10. SAVE SALARY SLIP IN DATABASE
    // ---------------------------------------

    const salarySlip = await SalarySlip.create({
      employee: employeeData._id,
      employeeId,

      month,
      year,

      basicSalary: basic,
      allowances: allowance,
      deductions: deduction,
      netSalary,

      paymentDate,
      status: "Pending",

      pdfUrl: `/uploads/salary-slips/${fileName}`,
      pdfPath,
    });

    // ---------------------------------------
    // 11. SUCCESS RESPONSE
    // ---------------------------------------

    return res.status(201).json({
      success: true,
      message: "Salary slip generated successfully.",
      salarySlip,
    });
  } catch (error) {
    console.error("Generate Salary Slip Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Salary slip already exists for this month.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to generate salary slip.",
      error: error.message,
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
};

// ======================================================
// GET ALL SALARY SLIPS
// GET /api/salary-slips
// ======================================================

exports.getAllSalarySlips = async (req, res) => {
  try {
    const salarySlips = await SalarySlip.find()
      .populate("employee")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: salarySlips.length,
      salarySlips,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================================
// GET SINGLE SALARY SLIP
// GET /api/salary-slips/:id
// ======================================================

exports.getSalarySlipById = async (req, res) => {
  try {
    const salarySlip = await SalarySlip.findById(req.params.id).populate(
      "employee",
    );

    if (!salarySlip) {
      return res.status(404).json({
        success: false,
        message: "Salary slip not found.",
      });
    }

    return res.status(200).json({
      success: true,
      salarySlip,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================================
// DOWNLOAD SALARY SLIP PDF
// GET /api/salary-slips/:id/pdf
// ======================================================

exports.downloadSalarySlipPDF = async (req, res) => {
  try {
    const salarySlip = await SalarySlip.findById(req.params.id);

    if (!salarySlip) {
      return res.status(404).json({
        success: false,
        message: "Salary slip not found.",
      });
    }

    if (!salarySlip.pdfPath || !fs.existsSync(salarySlip.pdfPath)) {
      return res.status(404).json({
        success: false,
        message: "Salary slip PDF file not found.",
      });
    }

    return res.download(salarySlip.pdfPath, path.basename(salarySlip.pdfPath));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================================
// UPDATE SALARY SLIP
// PUT /api/salary-slips/:id
// ======================================================

exports.updateSalarySlip = async (req, res) => {
  try {
    const { basicSalary, allowances, deductions, status } = req.body;

    const salarySlip = await SalarySlip.findById(req.params.id);

    if (!salarySlip) {
      return res.status(404).json({
        success: false,
        message: "Salary slip not found.",
      });
    }

    const basic =
      basicSalary !== undefined ? Number(basicSalary) : salarySlip.basicSalary;

    const allowance =
      allowances !== undefined ? Number(allowances) : salarySlip.allowances;

    const deduction =
      deductions !== undefined ? Number(deductions) : salarySlip.deductions;

    if (
      ![basic, allowance, deduction].every(Number.isFinite) ||
      basic <= 0 ||
      allowance < 0 ||
      deduction < 0 ||
      basic + allowance - deduction < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid salary amounts.",
      });
    }

    salarySlip.basicSalary = basic;
    salarySlip.allowances = allowance;
    salarySlip.deductions = deduction;
    salarySlip.netSalary = basic + allowance - deduction;

    if (status !== undefined) {
      if (!["Pending", "Paid", "Failed"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status.",
        });
      }

      salarySlip.status = status;
    }

    await salarySlip.save();

    return res.status(200).json({
      success: true,
      message: "Salary slip updated successfully.",
      salarySlip,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
