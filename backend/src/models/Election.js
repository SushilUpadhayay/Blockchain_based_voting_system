const mongoose = require('mongoose');
const crypto = require('crypto');

const electionSchema = new mongoose.Schema(
  {
    electionId: {
      type: Number,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    superAdmin: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    verifiers: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    registrationPeriod: {
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
    },
    votingPeriod: {
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
    },
    status: {
      type: String,
      enum: ['draft', 'registration_open', 'voting_active', 'ended'],
      default: 'draft',
    },
    inviteToken: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(16).toString('hex'),
    },
  },
  { timestamps: true }
);

const Election = mongoose.model('Election', electionSchema);
module.exports = Election;
