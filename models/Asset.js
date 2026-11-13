const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
  {
    assetCode: {
      type: String,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      enum: [
        "Laptop",
        "Desktop",
        "Mobile",
        "Monitor",
        "Keyboard",
        "Mouse",
        "ID Card",
        "SIM Card",
        "Vehicle",
        "Other",
      ],
    },

    brand: {
      type: String,
      default: "",
    },

    model: {
      type: String,
      default: "",
    },

    serialNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    issueDate: {
      type: Date,
      default: null,
    },

    condition: {
      type: String,
      enum: ["New", "Good", "Fair", "Damaged"],
      default: "New",
    },

    status: {
      type: String,
      enum: ["Available", "Assigned", "Under Repair", "Retired"],
      default: "Available",
    },

    description: {
      type: String,
      default: "",
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Asset", assetSchema);
