const User = require('../models/User');
const Candidate = require('../models/Candidate');
const { registerVoterOnChain, startElectionOnChain, endElectionOnChain, addCandidateOnChain, isVoterAuthorizedOnChain, getElectionStatusOnChain, getCandidatesFromChain } = require('../services/blockchainService');
const { sendStatusNotificationEmail } = require('../services/otpService');

/**
 * Helper to ensure the election has not started.
 * Throws an error if the election has already started.
 */
const checkElectionStarted = async (res) => {
  const electionStatus = await getElectionStatusOnChain();
  if (electionStatus.started) {
    res.status(400);
    throw new Error('Cannot modify user status after the election has started.');
  }
};

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
    await checkElectionStarted(res);
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

    // Send "Registration Approved" status email automatically
    sendStatusNotificationEmail(user, 'approved').catch(err => {
      console.error('Failed to send approval status email:', err);
    });

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
    await checkElectionStarted(res);
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

    // Send "Registration Rejected" status email automatically with reason
    sendStatusNotificationEmail(user, 'rejected', reason).catch(err => {
      console.error('Failed to send rejection status email:', err);
    });

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
    await checkElectionStarted(res);
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    user.status = 'blocked';
    user.rejectionReason = 'Permanently blocked by administrator';
    await user.save();

    // Send "Account Blocked" status email automatically
    sendStatusNotificationEmail(user, 'blocked').catch(err => {
      console.error('Failed to send blocked status email:', err);
    });

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

// @desc    Add a new candidate with optional photo & party
// @route   POST /api/admin/add-candidate
// @access  Private/Admin
const addCandidate = async (req, res, next) => {
  try {
    const { name, party } = req.body;
    if (!name) {
      res.status(400);
      throw new Error("Candidate name is required");
    }

    // 1. Add candidate to blockchain
    await addCandidateOnChain(name);

    // 2. Fetch candidates from blockchain to get assigned candidate ID
    const onChainCandidates = await getCandidatesFromChain();
    const newCandidate = onChainCandidates.find(c => c.name === name) || onChainCandidates[onChainCandidates.length - 1];

    let photoPath = null;
    if (req.file) {
      photoPath = `/uploads/candidates/${req.file.filename}`;
    }

    // 3. Store off-chain metadata (party & photo) in MongoDB
    if (newCandidate) {
      await Candidate.findOneAndUpdate(
        { candidateId: newCandidate.id },
        {
          candidateId: newCandidate.id,
          party: party ? party.trim() : '',
          photoPath
        },
        { upsert: true, new: true }
      );
    }

    res.json({ message: 'Candidate added successfully to blockchain', candidate: newCandidate });
  } catch (error) {
    next(error);
  }
};

// @desc    Get candidates merged with MongoDB metadata (photo & party)
// @route   GET /api/admin/candidates-meta or GET /api/user/candidates-meta
// @access  Private
const getCandidatesMeta = async (req, res, next) => {
  try {
    const onChainCandidates = await getCandidatesFromChain();
    const onChainIds = onChainCandidates.map(c => c.id);

    // Auto-sync Mongo candidate metadata with current blockchain state (purges stale records if node reset)
    await Candidate.syncWithChain(onChainIds);

    const metadataDocs = await Candidate.find({ candidateId: { $in: onChainIds } });
    const metaMap = {};
    metadataDocs.forEach(doc => {
      metaMap[doc.candidateId] = doc;
    });

    const merged = onChainCandidates.map(c => ({
      ...c,
      party: metaMap[c.id]?.party || '',
      photoPath: metaMap[c.id]?.photoPath || null
    }));

    res.json(merged);
  } catch (error) {
    next(error);
  }
};



// @desc    Get all registered users
// @route   GET /api/admin/registered-users
// @access  Private/Admin
const getRegisteredUsers = async (req, res, next) => {
  try {
    const registeredUsers = await User.find({ status: 'registered', role: 'user' });
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
  getCandidatesMeta,
  getRegisteredUsers,
  syncVoter
};
