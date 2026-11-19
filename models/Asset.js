const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
  {
    assetType: {
      type: String,
      enum: ["Laptop", "Mobile", "SIM Card"],
      required: true,
    },
    assetName: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
      default: "",
    },
    model: {
      type: String,
      trim: true,
      default: "",
    },
    identifier: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    purchaseDate: Date,
    warrantyExpiry: Date,
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
    remarks: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Asset", assetSchema);
