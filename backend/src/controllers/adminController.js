const User = require('../models/User');
const { registerVoterOnChain } = require('../services/blockchainService');

// @desc    Get all verified users waiting for admin approval
// @route   GET /api/admin/pending-users
// @access  Private/Admin
const getPendingUsers = async (req, res, next) => {
  try {
    // We fetch 'verified' users since they passed OCR and are waiting for admin
    const pendingUsers = await User.find({ status: 'verified' }).select('-otp -otpExpires');

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

    if (user.status !== 'verified') {
      res.status(400);
      throw new Error(`Cannot approve user with status: ${user.status}. Must be 'verified'.`);
    }

    if (!user.walletAddress) {
      res.status(400);
      throw new Error('Wallet not connected');
    }

    user.status = 'approved';

    // Register on blockchain
    const result = await registerVoterOnChain(user.walletAddress);

    // Optional: store tx hash
    user.txHash = result.txHash;

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
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.status === 'rejected') {
      res.status(400);
      throw new Error('User is already rejected');
    }

    user.status = 'rejected';
    await user.save();

    res.json({ message: 'User rejected successfully', status: user.status });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingUsers,
  approveUser,
  rejectUser,
};
