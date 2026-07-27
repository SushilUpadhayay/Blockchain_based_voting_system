const mongoose = require('mongoose');

const otpLimitSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: ['registration', 'login', 'voting'],
    },
    requestTimestamps: {
      type: [Date],
      default: [],
    },
    lockoutUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index so each email+purpose has exactly one tracking document
otpLimitSchema.index({ email: 1, purpose: 1 }, { unique: true });

// Auto-delete the limit record if it hasn't been updated for 24 hours (cleanup)
otpLimitSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

const OtpLimit = mongoose.model('OtpLimit', otpLimitSchema);
module.exports = OtpLimit;
