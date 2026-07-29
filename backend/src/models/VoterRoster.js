const mongoose = require('mongoose');

const voterRosterSchema = new mongoose.Schema(
  {
    electionId: {
      type: Number,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    employeeId: {
      type: String,
      required: true,
      trim: true,
    },
    citizenshipNumber: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfBirth: {
      type: String,   // stored as YYYY-MM-DD string; validated at import time
      required: true,
      trim: true,
    },
    invitationSent: {
      type: Boolean,
      default: false,
    },
    registeredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index to ensure an email is only imported once per election
voterRosterSchema.index({ electionId: 1, email: 1 }, { unique: true });

const VoterRoster = mongoose.model('VoterRoster', voterRosterSchema);
module.exports = VoterRoster;
