const mongoose = require('mongoose');

/**
 * Unified OTP Model — replaces all in-memory OTP storage.
 * 
 * Handles three OTP contexts:
 *   - 'registration': stores pending user data alongside the OTP
 *   - 'login': simple email + OTP for session authentication
 *   - 'voting': simple email + OTP for ballot authorization
 * 
 * Security features:
 *   - MongoDB TTL index auto-deletes expired documents (no manual cleanup needed)
 *   - OTP is deleted immediately after successful verification (prevents reuse)
 *   - Attempt counter locks after 5 failed tries
 */
const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    // The context this OTP was issued for — controls validation behavior
    purpose: {
      type: String,
      enum: ['registration', 'login', 'voting'],
      required: true,
    },
    // Track failed verification attempts to prevent brute-force attacks
    attempts: {
      type: Number,
      default: 0,
    },
    // For registration OTPs: store the pending user form data
    // so it persists across server restarts (replaces the in-memory Map)
    userData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    // MongoDB TTL index will auto-delete the document when this timestamp is reached
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: MongoDB automatically removes documents when Date.now() >= expiresAt
// The expireAfterSeconds: 0 means "expire at the exact expiresAt timestamp"
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for fast lookups by email + purpose
otpSchema.index({ email: 1, purpose: 1 });

const Otp = mongoose.model('Otp', otpSchema);
module.exports = Otp;
