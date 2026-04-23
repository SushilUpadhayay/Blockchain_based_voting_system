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
      required: true,
      unique: true,
    },
    dob: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    documentPath: {
      type: String,
      required: true,
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
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    otp: {
      type: String,
    },
    otpExpires: {
      type: Date,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);
module.exports = User;
