const User = require('../models/User');
const { registerVoterOnChain, startElectionOnChain, endElectionOnChain, addCandidateOnChain, isVoterAuthorizedOnChain } = require('../services/blockchainService');

// @desc    Get all verified users waiting for admin approval
// @route   GET /api/admin/pending-users
// @access  Private/Admin
const getPendingUsers = async (req, res, next) => {
  try {
    // We fetch 'pending' users since they completed upload and are waiting for admin
    const pendingUsers = await User.find({ status: 'pending', documentPath: { $ne: 'pending_upload' } }).select('-otp -otpExpires');

    res.json(pendingUsers);
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a user
// @route   POST /api/admin/approve/:id
// @access  Private/Admin
const approveUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.status !== 'pending') {
      res.status(400);
      throw new Error(`Cannot approve user with status: ${user.status}. Must be 'pending'.`);
    }

    if (!user.walletAddress) {
      res.status(400);
      throw new Error('Wallet not connected');
    }

    user.status = 'registered';
    user.rejectionReason = undefined;

    // Register on blockchain
    const result = await registerVoterOnChain(user.walletAddress);

    // Store tx hash from on-chain registration
    user.txHash = result.txHash;
    user.syncHistory.push({
      txHash: result.txHash,
      syncedAt: new Date()
    });

    await user.save();

    res.json({
      message: 'User approved and registered on blockchain',
      status: user.status,
      txHash: result.txHash
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a user
// @route   POST /api/admin/reject/:id
// @access  Private/Admin
const rejectUser = async (req, res, next) => {
  try {
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

    user.status = 'rejected';
    user.rejectionReason = reason;
    await user.save();

    res.json({ message: 'User rejected successfully', status: user.status, reason });
  } catch (error) {
    next(error);
  }
};

// @desc    Block a user permanently
// @route   POST /api/admin/block/:id
// @access  Private/Admin
const blockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    user.status = 'blocked';
    user.rejectionReason = 'Permanently blocked by administrator';
    await user.save();

    res.json({ message: 'User blocked permanently', status: user.status });
  } catch (error) {
    next(error);
  }
};

// @desc    Start the election
// @route   POST /api/admin/start-election
// @access  Private/Admin
const startElection = async (req, res, next) => {
  try {
    await startElectionOnChain();
    res.json({ message: 'Election started successfully on blockchain' });
  } catch (error) {
    next(error);
  }
};

// @desc    End the election
// @route   POST /api/admin/end-election
// @access  Private/Admin
const endElection = async (req, res, next) => {
  try {
    await endElectionOnChain();
    res.json({ message: 'Election ended successfully on blockchain' });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a new candidate
// @route   POST /api/admin/add-candidate
// @access  Private/Admin
const addCandidate = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400);
      throw new Error("Candidate name is required");
    }
    await addCandidateOnChain(name);
    res.json({ message: 'Candidate added successfully to blockchain' });
  } catch (error) {
    next(error);
  }
};


// @desc    Get all registered users
// @route   GET /api/admin/registered-users
// @access  Private/Admin
const getRegisteredUsers = async (req, res, next) => {
  try {
    const registeredUsers = await User.find({ status: 'registered' });
    res.json(registeredUsers);
  } catch (error) {
    next(error);
  }
};

// @desc    Sync voter to blockchain if missing
// @route   POST /api/admin/sync-voter/:id
// @access  Private/Admin
const syncVoter = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.status !== 'registered') {
      res.status(400);
      throw new Error(`Cannot sync user with status: ${user.status}. Must be 'registered'.`);
    }

    if (!user.walletAddress) {
      res.status(400);
      throw new Error('User does not have a linked wallet address');
    }

    console.log(`[AdminSync] Checking blockchain authorization for user: ${user.email} (${user.walletAddress})`);
    
    // Check if already authorized on-chain
    const isAuthorized = await isVoterAuthorizedOnChain(user.walletAddress);

    if (isAuthorized) {
      console.log(`[AdminSync] User ${user.email} is already authorized on-chain.`);
      return res.json({
        message: 'Voter is already authorized on the blockchain',
        status: user.status,
        txHash: user.txHash,
        syncHistory: user.syncHistory,
        alreadySynced: true
      });
    }

    console.log(`[AdminSync] User ${user.email} not found on-chain. Synchronizing...`);

    // Register on blockchain
    const result = await registerVoterOnChain(user.walletAddress);

    console.log(`[AdminSync] Synchronization successful for user ${user.email}. TxHash: ${result.txHash}`);

    // Update txHash to latest and append to sync history
    user.txHash = result.txHash;
    user.syncHistory.push({
      txHash: result.txHash,
      syncedAt: new Date()
    });

    await user.save();

    res.json({
      message: 'Voter successfully synchronized to blockchain',
      status: user.status,
      txHash: user.txHash,
      syncHistory: user.syncHistory
    });
  } catch (error) {
    console.error(`[AdminSync] Synchronization failed for user ID ${req.params.id}:`, error.message);
    next(error);
  }
};


module.exports = {
  getPendingUsers,
  approveUser,
  rejectUser,
  blockUser,
  startElection,
  endElection,
  addCandidate,
  getRegisteredUsers,
  syncVoter
};
