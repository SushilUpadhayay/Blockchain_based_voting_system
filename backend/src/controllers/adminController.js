const User = require('../models/User');
const VoterRoster = require('../models/VoterRoster');
const Candidate = require('../models/Candidate');
const Election = require('../models/Election');
const {
  registerVoterOnChain,
  isVoterAuthorizedOnChain,
  getElectionStatusOnChain,
} = require('../services/blockchainService');
const { sendStatusNotificationEmail } = require('../services/otpService');
const { compareVoterData } = require('../services/verificationComparisonService');

/**
 * Helper to ensure the election has not started (reads MongoDB, no RPC).
 */
const checkElectionStarted = async (electionId, res) => {
  const election = await Election.findOne({ electionId });
  if (!election) {
    res.status(404);
    throw new Error('Election not found');
  }
  if (election.status === 'voting_active') {
    res.status(400);
    throw new Error('Cannot modify user status after the election has started.');
  }
};

const scopeUserToElection = (user, electionId) => {
  const obj = user.toObject ? user.toObject() : user;
  const reg = (obj.elections || []).find((entry) => Number(entry.electionId) === Number(electionId));
  return {
    ...obj,
    status: reg?.status || null,
    rejectionReason: reg?.rejectionReason || null,
    electionId: reg?.electionId || null,
    elections: reg ? [reg] : [],
  };
};

/**
 * Attaches dynamically computed verification objects to an array of scoped user objects.
 * Batch queries matching Excel roster records for efficiency.
 */
const attachVerificationToUsers = async (users, electionId) => {
  if (!users || users.length === 0) return [];

  const eId = Number(electionId);
  const emails = users.map((u) => u.email?.toLowerCase()).filter(Boolean);

  const rosterRecords = await VoterRoster.find({
    electionId: eId,
    email: { $in: emails },
  });

  const rosterMap = new Map(
    rosterRecords.map((r) => [r.email.toLowerCase(), r])
  );

  return users.map((user) => {
    const userObj = scopeUserToElection(user, eId);
    const rosterRecord = rosterMap.get(user.email?.toLowerCase()) || null;
    const ocrData = (user.ocrData && user.ocrData.ocrSuccess) ? user.ocrData : null;

    userObj.verification = compareVoterData(userObj, rosterRecord, ocrData);
    return userObj;
  });
};

// @desc    Get all verified users waiting for admin/verifier approval for a specific election
// @route   GET /api/admin/elections/:electionId/pending-users
// @access  Private/RegistrationVerifier/Election Administrator
const getPendingUsers = async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);

    // Fetch users who have the same election registration entry with status 'pending'.
    const pendingUsers = await User.find({
      elections: { $elemMatch: { electionId, status: 'pending' } },
      documentPath: { $ne: 'pending_upload' },
    }).select('-otp -otpExpires');

    const result = await attachVerificationToUsers(pendingUsers, electionId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a user for a specific election (blockchain tx done by MetaMask on frontend)
// @route   POST /api/admin/elections/:electionId/approve/:id
// @access  Private/RegistrationVerifier/Election Administrator
const approveUser = async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);
    await checkElectionStarted(electionId, res);

    let { txHash } = req.body || {};

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (!user.walletAddress) {
      res.status(400);
      throw new Error('Voter wallet address is not linked to this account');
    }

    const reg = user.getElectionRegistration(electionId);
    if (!reg) {
      res.status(400);
      throw new Error('This user is not registered for this election.');
    }

    const roster = await VoterRoster.findOne({ electionId, email: user.email.toLowerCase() });
    if (!roster) {
      res.status(403);
      throw new Error('This user is not on the voter roster for this election.');
    }
    if (roster.registeredUserId && String(roster.registeredUserId) !== String(user._id)) {
      res.status(409);
      throw new Error('This roster entry is already linked to another user.');
    }

    const currentStatus = reg.status;
    if (currentStatus !== 'pending') {
      res.status(400);
      throw new Error(`Cannot approve user with status: ${currentStatus}. Must be 'pending'.`);
    }

    if (!txHash) {
      const result = await registerVoterOnChain(electionId, user.walletAddress);
      txHash = result.txHash;
    }

    // Update MongoDB only after the blockchain authorization has succeeded.
    const approverWallet = req.user?.walletAddress || 'registration_verifier';
    user.setElectionRegistration(electionId, {
      status: 'registered',
      approvedBy: approverWallet,
      approvedAt: new Date(),
      txHash,
    });

    await user.save();

    // Link user to VoterRoster if matching email exists
    await VoterRoster.findOneAndUpdate(
      { electionId, email: user.email.toLowerCase() },
      { registeredUserId: user._id }
    );

    // Send "Registration Approved" status email
    sendStatusNotificationEmail(user, 'registered').catch((err) => {
      console.error('Failed to send approval status email:', err);
    });

    res.json({
      message: 'Voter approval confirmed and saved to database',
      status: 'registered',
      txHash,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a user for a specific election
// @route   POST /api/admin/elections/:electionId/reject/:id
// @access  Private/RegistrationVerifier/Election Administrator
const rejectUser = async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);
    await checkElectionStarted(electionId, res);

    const { reason } = req.body;
    if (!reason) {
      res.status(400);
      throw new Error('Rejection reason is required');
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const reg = user.getElectionRegistration(electionId);
    if (!reg) {
      res.status(400);
      throw new Error('This user is not registered for this election.');
    }
    if (reg.status !== 'pending') {
      res.status(400);
      throw new Error(`Cannot reject user with status: ${reg.status}. Must be 'pending'.`);
    }

    user.setElectionRegistration(electionId, {
      status: 'rejected',
      rejectionReason: reason,
    });

    await user.save();

    // Send "Registration Rejected" status email
    sendStatusNotificationEmail(user, 'rejected', reason).catch((err) => {
      console.error('Failed to send rejection status email:', err);
    });

    res.json({ message: 'User rejected successfully', status: 'rejected', reason });
  } catch (error) {
    next(error);
  }
};

// @desc    Block a user permanently for a specific election
// @route   POST /api/admin/elections/:electionId/block/:id
// @access  Private/RegistrationVerifier/Election Administrator
const blockUser = async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);
    await checkElectionStarted(electionId, res);

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const reg = user.getElectionRegistration(electionId);
    if (!reg) {
      res.status(400);
      throw new Error('This user is not registered for this election.');
    }

    user.setElectionRegistration(electionId, {
      status: 'blocked',
      rejectionReason: 'Permanently blocked by administrator',
    });

    await user.save();

    // Send "Account Blocked" status email
    sendStatusNotificationEmail(user, 'blocked').catch((err) => {
      console.error('Failed to send blocked status email:', err);
    });

    res.json({
      message: 'User blocked successfully',
      status: 'blocked',
      user: scopeUserToElection(user, electionId),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registered users for an election
// @route   GET /api/admin/elections/:electionId/registered-users
// @access  Private/RegistrationVerifier/Election Administrator
const getRegisteredUsers = async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);
    const registeredUsers = await User.find({
      elections: { $elemMatch: { electionId, status: 'registered' } },
    });
    const result = await attachVerificationToUsers(registeredUsers, electionId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Sync voter to blockchain for electionId if missing
// @route   POST /api/admin/elections/:electionId/sync-voter/:id
// @access  Private/RegistrationVerifier/Election Administrator
const syncVoter = async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const reg = user.getElectionRegistration(electionId);
    if (!reg || reg.status !== 'registered') {
      res.status(400);
      throw new Error(`Cannot sync user for election ${electionId}. Registration status is not 'registered'.`);
    }

    if (!user.walletAddress) {
      res.status(400);
      throw new Error('User does not have a linked wallet address');
    }

    const isAuthorized = await isVoterAuthorizedOnChain(electionId, user.walletAddress);
    if (isAuthorized) {
      return res.json({
        message: 'Voter is already authorized on the blockchain',
        status: 'registered',
        alreadySynced: true,
      });
    }

    const result = await registerVoterOnChain(electionId, user.walletAddress);

    user.setElectionRegistration(electionId, {
      status: 'registered',
      txHash: result.txHash,
    });

    await user.save();

    res.json({
      message: 'Voter successfully synchronized to blockchain',
      status: 'registered',
      txHash: result.txHash,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingUsers,
  approveUser,
  rejectUser,
  blockUser,
  getRegisteredUsers,
  syncVoter,
};
