const Asset = require("../models/Asset");
const User = require("../models/User");
const mongoose = require("mongoose");

const AssetAssignment = require("../models/AssetAssignment");

// --------------------------------------------------
// ADD ASSET - ADMIN
// POST /api/assets
// --------------------------------------------------

exports.createAsset = async (req, res) => {
  try {
    const {
      name,
      category,
      brand,
      model,
      serialNumber,
      condition,
      description,
    } = req.body;

    if (!name || !category || !serialNumber) {
      return res.status(400).json({
        success: false,
        message: "Name, category and serial number are required.",
      });
    }

    const existingAsset = await Asset.findOne({
      serialNumber: serialNumber.trim(),
    });

    if (existingAsset) {
      return res.status(409).json({
        success: false,
        message: "Asset with this serial number already exists.",
      });
    }

    const count = await Asset.countDocuments();

    const asset = await Asset.create({
      assetCode: `AST-${String(count + 1).padStart(3, "0")}`,
      name,
      category,
      brand,
      model,
      serialNumber: serialNumber.trim(),
      condition: condition || "New",
      description,
      status: "Available",
    });

    return res.status(201).json({
      success: true,
      message: "Asset created successfully.",
      asset,
    });
  } catch (error) {
    console.error("Create Asset Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create asset.",
    });
  }
};

// --------------------------------------------------
// GET ALL ASSETS - ADMIN
// GET /api/assets
// --------------------------------------------------

exports.getAllAssets = async (req, res) => {
  try {
    const assets = await Asset.find()
      .populate("employee", "name firstName lastName employeeId email")
      .populate("assignedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: assets.length,
      assets,
    });
  } catch (error) {
    console.error("Get Assets Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch assets.",
    });
  }
};

// --------------------------------------------------
// UPDATE ASSET - ADMIN
// PUT /api/assets/:id
// --------------------------------------------------

exports.updateAsset = async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "category",
      "brand",
      "model",
      "serialNumber",
      "condition",
      "description",
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const asset = await Asset.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Asset updated successfully.",
      asset,
    });
  } catch (error) {
    console.error("Update Asset Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update asset.",
    });
  }
};

// --------------------------------------------------
// ASSIGN ASSET TO EMPLOYEE - ADMIN
// PATCH /api/assets/:id/assign
// --------------------------------------------------

exports.assignAsset = async (req, res) => {
  try {
    const { employeeId, issueDate } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required.",
      });
    }

    const employee = await User.findById(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    if (employee.role !== "employee") {
      return res.status(400).json({
        success: false,
        message: "Selected user is not an employee.",
      });
    }

    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found.",
      });
    }

    if (asset.status !== "Available") {
      return res.status(400).json({
        success: false,
        message: "Only available assets can be assigned.",
      });
    }

    asset.employee = employee._id;
    asset.issueDate = issueDate ? new Date(issueDate) : new Date();
    asset.status = "Assigned";
    asset.assignedBy = req.user._id;

    await asset.save();

    await asset.populate(
      "employee",
      "name firstName lastName employeeId email",
    );

    return res.status(200).json({
      success: true,
      message: "Asset assigned successfully.",
      asset,
    });
  } catch (error) {
    console.error("Assign Asset Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to assign asset.",
    });
  }
};

// --------------------------------------------------
// RETURN ASSET - ADMIN
// PATCH /api/assets/:id/return
// --------------------------------------------------

exports.returnAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found.",
      });
    }

    if (asset.status !== "Assigned") {
      return res.status(400).json({
        success: false,
        message: "This asset is not currently assigned.",
      });
    }

    asset.employee = null;
    asset.issueDate = null;
    asset.status = "Available";

    await asset.save();

    return res.status(200).json({
      success: true,
      message: "Asset returned successfully.",
      asset,
    });
  } catch (error) {
    console.error("Return Asset Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to return asset.",
    });
  }
};

// --------------------------------------------------
// DELETE ASSET - ADMIN
// DELETE /api/assets/:id
// --------------------------------------------------

exports.deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found.",
      });
    }

    if (asset.status === "Assigned") {
      return res.status(400).json({
        success: false,
        message: "Return this asset before deleting it.",
      });
    }

    await asset.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Asset deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Asset Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete asset.",
    });
  }
};

// --------------------------------------------------
// GET LOGGED-IN EMPLOYEE ASSETS
// GET /api/employee/assets/my
// --------------------------------------------------

exports.getMyAssets = async (req, res) => {
  try {
    const assets = await Asset.find({
      employee: req.user._id,
      status: "Assigned",
    }).sort({ issueDate: -1 });

    return res.status(200).json({
      success: true,
      count: assets.length,
      assets,
    });
  } catch (error) {
    console.error("Get My Assets Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your assets.",
    });
  }
};

// ADD ASSET
exports.createAsset = async (req, res) => {
  try {
    const {
      assetType,
      assetName,
      brand,
      model,
      identifier,
      purchaseDate,
      warrantyExpiry,
      condition,
      remarks,
    } = req.body;

    if (!assetType || !assetName || !identifier) {
      return res.status(400).json({
        success: false,
        message: "Asset type, asset name and identifier are required.",
      });
    }

    const asset = await Asset.create({
      assetType,
      assetName,
      brand,
      model,
      identifier,
      purchaseDate,
      warrantyExpiry,
      condition,
      remarks,
    });

    res.status(201).json({
      success: true,
      message: "Asset added successfully.",
      asset,
    });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message:
        error.code === 11000
          ? "This serial number / IMEI / SIM number already exists."
          : error.message,
    });
  }
};

// GET ALL ASSETS
exports.getAllAssets = async (req, res) => {
  try {
    const assets = await Asset.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: assets.length,
      assets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ASSET STATISTICS
exports.getAssetStats = async (req, res) => {
  try {
    const [total, assigned, available, underRepair, retired] =
      await Promise.all([
        Asset.countDocuments(),
        Asset.countDocuments({ status: "Assigned" }),
        Asset.countDocuments({ status: "Available" }),
        Asset.countDocuments({ status: "Under Repair" }),
        Asset.countDocuments({ status: "Retired" }),
      ]);

    res.status(200).json({
      success: true,
      stats: { total, assigned, available, underRepair, retired },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET EMPLOYEES FOR ASSIGNMENT
exports.getEmployeesForAsset = async (req, res) => {
  try {
    const employees = await User.find({ role: "employee" })
      .select("_id employeeId firstName lastName name email department")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      employees,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ASSIGN ASSET
exports.assignAsset = async (req, res) => {
  try {
    const { assetId, employeeId, assignedDate, expectedReturnDate, remarks } =
      req.body;

    if (
      !mongoose.isValidObjectId(assetId) ||
      !mongoose.isValidObjectId(employeeId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset or employee ID.",
      });
    }

    const asset = await Asset.findById(assetId);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found.",
      });
    }

    if (asset.status !== "Available") {
      return res.status(400).json({
        success: false,
        message: "This asset is not available for assignment.",
      });
    }

    const employee = await User.findOne({
      _id: employeeId,
      role: "employee",
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    if (
      expectedReturnDate &&
      new Date(expectedReturnDate) < new Date(assignedDate || Date.now())
    ) {
      return res.status(400).json({
        success: false,
        message: "Return date cannot be before assignment date.",
      });
    }

    // Conditional update prevents assigning an already-assigned asset.
    const updatedAsset = await Asset.findOneAndUpdate(
      { _id: assetId, status: "Available" },
      { $set: { status: "Assigned" } },
      { new: true },
    );

    if (!updatedAsset) {
      return res.status(409).json({
        success: false,
        message: "Asset has already been assigned. Please refresh.",
      });
    }

    try {
      const assignment = await AssetAssignment.create({
        asset: assetId,
        employee: employeeId,
        assignedBy: req.user?._id,
        assignedDate: assignedDate || new Date(),
        expectedReturnDate: expectedReturnDate || null,
        remarks: remarks || "",
      });

      res.status(201).json({
        success: true,
        message: "Asset assigned successfully.",
        assignment,
      });
    } catch (error) {
      // Restore availability if assignment creation fails.
      await Asset.updateOne(
        { _id: assetId, status: "Assigned" },
        { $set: { status: "Available" } },
      );
      throw error;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ASSIGNMENT HISTORY
exports.getAssignmentHistory = async (req, res) => {
  try {
    const assignments = await AssetAssignment.find()
      .populate("asset")
      .populate("employee", "employeeId firstName lastName name email")
      .populate("assignedBy", "firstName lastName name")
      .populate("returnedBy", "firstName lastName name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// RETURN ASSET
exports.returnAsset = async (req, res) => {
  try {
    const assignment = await AssetAssignment.findOne({
      _id: req.params.assignmentId,
      status: "Assigned",
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Active assignment not found.",
      });
    }

    const asset = await Asset.findOneAndUpdate(
      { _id: assignment.asset, status: "Assigned" },
      { $set: { status: "Available" } },
      { new: true },
    );

    if (!asset) {
      return res.status(409).json({
        success: false,
        message: "Asset status could not be updated. Please refresh.",
      });
    }

    assignment.status = "Returned";
    assignment.returnedAt = new Date();
    assignment.returnedBy = req.user?._id;
    await assignment.save();

    res.status(200).json({
      success: true,
      message: "Asset returned successfully.",
      assignment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// EMPLOYEE: MY ASSETS
exports.getMyAssets = async (req, res) => {
  try {
    const assignments = await AssetAssignment.find({
      employee: req.user._id,
      status: "Assigned",
    })
      .populate("asset")
      .sort({ assignedDate: -1 });

    res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE ASSET
exports.updateAsset = async (req, res) => {
  try {
    const allowedFields = [
      "assetType",
      "assetName",
      "brand",
      "model",
      "identifier",
      "purchaseDate",
      "warrantyExpiry",
      "condition",
      "remarks",
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const asset = await Asset.findByIdAndUpdate(
      req.params.assetId,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Asset updated successfully.",
      asset,
    });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message:
        error.code === 11000 ? "Identifier already exists." : error.message,
    });
  }
};
