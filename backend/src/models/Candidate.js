const mongoose = require('mongoose');

/**
 * Off-chain metadata for blockchain candidates.
 *
 * The blockchain (Voting.sol) is the authoritative source for:
 *   - candidateId (uint256, sequential starting from 1)
 *   - name
 *   - voteCount
 *
 * This model stores supplementary data that cannot live on-chain:
 *   - photo  (filesystem path, served via /uploads/candidates/)
 *   - party  (optional string; empty string = independent)
 *
 * Stale-data contract:
 *   If the Hardhat node is restarted (fresh blockchain state), the caller
 *   must invoke Candidate.syncWithChain(onChainIds) to purge orphaned records.
 */
const candidateSchema = new mongoose.Schema(
  {
    candidateId: {
      type: Number,
      required: true,
      unique: true,
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

/**
 * Removes any MongoDB candidate records whose candidateId is NOT in onChainIds.
 * Call this whenever you read the full candidate list from the blockchain.
 *
 * @param {number[]} onChainIds - Array of candidate IDs currently on-chain.
 */
candidateSchema.statics.syncWithChain = async function (onChainIds) {
  if (onChainIds.length === 0) {
    // Blockchain has no candidates - wipe everything (node was likely restarted)
    const deleted = await this.deleteMany({});
    if (deleted.deletedCount > 0) {
      console.log(`[Candidate] Blockchain has 0 candidates - purged ${deleted.deletedCount} stale metadata record(s).`);
    }
    return;
  }
  // Remove any record whose ID no longer exists on-chain
  const result = await this.deleteMany({ candidateId: { $nin: onChainIds } });
  if (result.deletedCount > 0) {
    console.log(`[Candidate] Purged ${result.deletedCount} stale metadata record(s) not present on-chain.`);
  }
};

const Candidate = mongoose.model('Candidate', candidateSchema);
module.exports = Candidate;
