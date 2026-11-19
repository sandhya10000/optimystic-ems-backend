const mongoose = require("mongoose");

const digilockerVerificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
    },

    emailId: {
      type: String,
      required: true,
      lowercase: true,
    },

    transactionId: {
      type: String,
      default: null,
    },

    code: {
      type: String,
      default: null,
    },

    digilockerUrl: {
      type: String,
      default: null,
    },

    kycUrl: {
      type: String,
      default: null,
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "expired"],
      default: "pending",
    },

    expiry: {
      type: String,
      default: "345600000",
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    provider: {
      type: String,
      default: "indiconnect",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  "DigilockerVerification",
  digilockerVerificationSchema,
);
