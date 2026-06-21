const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    idNumber: {
      type: String,
      required: function () {
        return this.role === 'user';
      },
      unique: true,
      sparse: true,
    },
    dob: {
      type: String,
      required: function () {
        return this.role === 'user';
      },
    },
    address: {
      type: String,
      required: function () {
        return this.role === 'user';
      },
    },
    documentPath: {
      type: String,
      default: 'pending_upload',
    },
    status: {
      type: String,
      enum: ['pending', 'registered', 'rejected', 'blocked'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
    },
    walletAddress: {
      type: String,
      required: function () {
        return this.role === 'user';
      },
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    txHash: {
      type: String,
    },
    syncHistory: [
      {
        txHash: { type: String, required: true },
        syncedAt: { type: Date, default: Date.now }
      }
    ],
    // NOTE: OTP fields (otp, otpExpires, otpAttempts) have been moved to
    // the dedicated Otp model for persistent, TTL-managed storage.
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);
module.exports = User;
