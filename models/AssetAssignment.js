const mongoose = require("mongoose");

const assetAssignmentSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expectedReturnDate: Date,
    returnedAt: Date,
    returnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    remarks: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Assigned", "Returned"],
      default: "Assigned",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AssetAssignment", assetAssignmentSchema);
