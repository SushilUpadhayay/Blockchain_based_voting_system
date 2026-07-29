const mongoose = require('mongoose');

/**
 * Off-chain metadata for blockchain candidates.
 *
 * The blockchain (Voting.sol) is the authoritative source for:
 *   - electionId (uint256)
 *   - candidateId (uint256, sequential starting from 1 per election)
 *   - name
 *   - voteCount
 *
 * This model stores supplementary data that cannot live on-chain:
 *   - photo  (filesystem path, served via /uploads/candidates/)
 *   - party  (optional string; empty string = independent)
 *
 * Stale-data contract:
 *   If the Hardhat node is restarted (fresh blockchain state), the caller
 *   must invoke Candidate.syncWithChain(electionId, onChainIds) to purge orphaned records.
 */
const candidateSchema = new mongoose.Schema(
  {
    electionId: {
      type: Number,
      required: true,
    },
    candidateId: {
      type: Number,
      required: true,
    },
    party: {
      type: String,
      default: '',
      trim: true,
    },
    photoPath: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index: candidateId is unique PER election
candidateSchema.index({ electionId: 1, candidateId: 1 }, { unique: true });

/**
 * Removes any MongoDB candidate records for an election whose candidateId is NOT in onChainIds.
 * Call this whenever you read the full candidate list from the blockchain.
 *
 * @param {number} electionId - On-chain election ID.
 * @param {number[]} onChainIds - Array of candidate IDs currently on-chain.
 */
candidateSchema.statics.syncWithChain = async function (electionId, onChainIds) {
  if (!electionId) {
    throw new Error('electionId is required for Candidate.syncWithChain');
  }

  if (onChainIds.length === 0) {
    // Blockchain has no candidates for this election - wipe metadata for this election
    const deleted = await this.deleteMany({ electionId });
    if (deleted.deletedCount > 0) {
      console.log(`[Candidate] Election ${electionId} has 0 candidates on-chain - purged ${deleted.deletedCount} stale metadata record(s).`);
    }
    return;
  }
  // Remove any record for this election whose ID no longer exists on-chain
  const result = await this.deleteMany({ electionId, candidateId: { $nin: onChainIds } });
  if (result.deletedCount > 0) {
    console.log(`[Candidate] Election ${electionId}: purged ${result.deletedCount} stale metadata record(s) not present on-chain.`);
  }
};

const Candidate = mongoose.model('Candidate', candidateSchema);
module.exports = Candidate;

