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
    hashedInviteCode: {
      type: String,
      required: true,
    },
    codeAttempts: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'revoked'],
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

verifierInviteSchema.index({ electionId: 1, email: 1 });

/**
 * Hash an invitation code using SHA-256 (normalized to uppercase)
 */
const hashInviteCode = (code) => {
  const cleanCode = String(code || '').trim().toUpperCase();
  return crypto.createHash('sha256').update(cleanCode).digest('hex');
};

/**
 * Perform constant-time comparison between entered code and stored hash
 */
const verifyInviteCode = (enteredCode, storedHash) => {
  if (!enteredCode || !storedHash) return false;
  const enteredHash = hashInviteCode(enteredCode);
  const bufA = Buffer.from(enteredHash, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

const VerifierInvite = mongoose.model('VerifierInvite', verifierInviteSchema);
VerifierInvite.hashInviteCode = hashInviteCode;
VerifierInvite.verifyInviteCode = verifyInviteCode;

module.exports = VerifierInvite;
