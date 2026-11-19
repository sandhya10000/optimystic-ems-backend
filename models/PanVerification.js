const mongoose = require("mongoose");

const panVerificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    panNumber: {
      type: String,
      required: true,
    },

    provider: {
      type: String,
      default: "indiconnect",
    },

    documentType: {
      type: String,
      default: "PAN Comprehensive",
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "failed"],
      default: "pending",
    },

    providerReferenceId: {
      type: String,
      default: null,
    },

    providerResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("PanVerification", panVerificationSchema);
