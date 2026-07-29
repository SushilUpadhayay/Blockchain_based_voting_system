const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const electionRegistrationSchema = new mongoose.Schema(
  {
    electionId: {
      type: Number,
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
    approvedBy: {
      type: String,
      lowercase: true,
      trim: true,
    },
    approvedAt: {
      type: Date,
    },
    txHash: {
      type: String,
    },
    syncHistory: [
      {
        txHash: { type: String, required: true },
        syncedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

/**
 * Per-election admin/verifier role subdocument.
 * Used by both Election Administrator (Piece 5) and Registration Verifier (Piece 3).
 * Kept parallel to elections[] (voter registrations) so roles are per-election scoped,
 * not a single global field that would clobber multi-election participation.
 */
const adminRoleSchema = new mongoose.Schema(
  {
    electionId: {
      type: Number,
      required: true,
    },
    role: {
      type: String,
      enum: ['superadmin', 'verifier'],
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      select: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    citizenshipNumber: {
      type: String,
      required: function () {
        return this.role === 'user';
      },
      unique: true,
      sparse: true,
    },
    employeeId: {
      type: String,
      trim: true,
      sparse: true,
    },
    dob: {
      type: String,
      required: function () {
        return this.role === 'user';
      },
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
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
      enum: ['user', 'admin', 'verifier'],
      default: 'user',
    },
    elections: [electionRegistrationSchema],
    adminRoles: [adminRoleSchema],
    // NOTE: OTP fields (otp, otpExpires, otpAttempts) have been moved to
    // the dedicated Otp model for persistent, TTL-managed storage.
  },
  {
    timestamps: true,
  }
);

/**
 * Hash password before save.
 * Guards against double-hashing: skips if the string already starts with a
 * known bcrypt prefix ($2a$, $2b$, $2y$) — covers all bcryptjs output variants.
 */
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }
  // Already a bcrypt hash — do not re-hash (e.g. pre-hashed from registerVerifierInit)
  if (/^\$2[aby]\$/.test(this.password)) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Match entered password against hashed password in DB.
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Get per-election admin/verifier role for a given electionId.
 * Used by Piece 3 (verifier) and Piece 5 (election administrator).
 * @param {number} electionId
 * @returns {'superadmin'|'verifier'|null}
 */
userSchema.methods.getElectionRole = function (electionId) {
  const entry = (this.adminRoles || []).find((r) => r.electionId === Number(electionId));
  return entry ? entry.role : null;
};

/**
 * Add or update per-election admin/verifier role.
 * Idempotent — updating an existing entry just updates assignedAt.
 * Also promotes top-level role to 'admin' (for backward-compat middleware guards).
 * @param {number} electionId
 * @param {'superadmin'|'verifier'} role
 */
userSchema.methods.addElectionRole = function (electionId, role) {
  const eId = Number(electionId);
  if ((this.elections || []).length > 0) {
    throw new Error('A voter account cannot be assigned an admin or verifier role.');
  }
  const conflictingRole = (this.adminRoles || []).find((r) => r.role !== role);
  if (conflictingRole) {
    throw new Error(`This account is already assigned as ${conflictingRole.role} and cannot also be ${role}.`);
  }
  const existing = this.adminRoles.find((r) => r.electionId === eId);
  if (existing) {
    if (existing.role !== role) {
      throw new Error(`This account already has a different role for election ${eId}.`);
    }
    existing.role = role;
    existing.assignedAt = new Date();
  } else {
    this.adminRoles.push({ electionId: eId, role, assignedAt: new Date() });
  }
  // Ensure top-level role is at least 'admin' for middleware compatibility
  if (this.role === 'user') {
    this.role = 'admin';
  }
};

/**
 * Helper to retrieve registration details for a specific electionId.
 * @param {number} electionId
 * @returns {object|null}
 */
userSchema.methods.getElectionRegistration = function (electionId) {
  if (!this.elections) return null;
  return this.elections.find((e) => e.electionId === Number(electionId)) || null;
};

/**
 * Helper to update or create an election registration subdocument.
 * @param {number} electionId
 * @param {object} updates - { status, rejectionReason, approvedBy, approvedAt, txHash }
 * @returns {object} updated election registration subdocument
 */
userSchema.methods.setElectionRegistration = function (electionId, updates = {}) {
  if ((this.adminRoles || []).length > 0 || this.role === 'admin' || this.role === 'verifier') {
    throw new Error('Admin and verifier accounts cannot be registered as voters.');
  }

  const eId = Number(electionId);
  let reg = this.elections.find((e) => e.electionId === eId);
  if (!reg) {
    reg = { electionId: eId, status: updates.status || 'pending', syncHistory: [] };
    this.elections.push(reg);
    reg = this.elections[this.elections.length - 1];
  }

  if (updates.status !== undefined) reg.status = updates.status;
  if (updates.rejectionReason !== undefined) reg.rejectionReason = updates.rejectionReason;
  if (updates.approvedBy !== undefined) reg.approvedBy = updates.approvedBy;
  if (updates.approvedAt !== undefined) reg.approvedAt = updates.approvedAt;
  if (updates.txHash !== undefined) {
    reg.txHash = updates.txHash;
    reg.syncHistory.push({ txHash: updates.txHash, syncedAt: new Date() });
  }

  return reg;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
