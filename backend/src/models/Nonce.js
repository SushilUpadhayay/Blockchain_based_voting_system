const mongoose = require('mongoose');

const nonceSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// MongoDB TTL index to auto-delete document when current time exceeds 'expiresAt'
nonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Nonce = mongoose.model('Nonce', nonceSchema);
module.exports = Nonce;
