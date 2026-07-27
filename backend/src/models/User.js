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
      lowercase: true,
      trim: true,
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
    documentFrontPath: {
      type: String,
    },
    documentBackPath: {
      type: String,
    },
    ocrData: {
      citizenshipNumber:     { type: String, default: null },
      fullName:              { type: String, default: null },
      gender:                { type: String, default: null },
      dateOfBirth: {
        year:  { type: String, default: null },
        month: { type: String, default: null },
        day:   { type: String, default: null },
      },
      birthDistrict:         { type: String, default: null },
      birthMunicipality:     { type: String, default: null },
      birthWardNo:           { type: String, default: null },
      permanentDistrict:     { type: String, default: null },
      permanentMunicipality: { type: String, default: null },
      permanentWardNo:       { type: String, default: null },
      confidence:            { type: Number, default: null },
      rawText:               { type: String, default: null },
      extractedAt:           { type: Date, default: Date.now },
      ocrSuccess:            { type: Boolean, default: false },
      ocrError:              { type: String, default: null },
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
      unique: true,
      sparse: true, // allows multiple admins with no walletAddress without colliding
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
