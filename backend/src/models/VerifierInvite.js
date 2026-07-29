const mongoose = require('mongoose');
const crypto = require('crypto');

const verifierInviteSchema = new mongoose.Schema(
  {
    electionId: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(16).toString('hex'),
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired'],
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiration
    },
  },
  { timestamps: true }
);

verifierInviteSchema.index({ electionId: 1, email: 1 });

const VerifierInvite = mongoose.model('VerifierInvite', verifierInviteSchema);
module.exports = VerifierInvite;
