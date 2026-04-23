const User = require('../models/User');
const { extractIdentityData } = require('../services/ocrService');

// @desc    Upload ID Document & perform OCR
// @route   POST /api/user/upload-document
// @access  Public (Requires userId in body)
const uploadDocument = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400);
      throw new Error('Please provide a userId');
    }

    if (!req.file) {
      res.status(400);
      throw new Error('Please upload an image or PDF document');
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.status !== 'pending') {
      res.status(400);
      throw new Error(`Cannot upload document. Current status: ${user.status}. Only pending users can upload.`);
    }

    // Save document path
    user.documentPath = req.file.path;
    await user.save();

    // Call Mock OCR
    const ocrResult = await extractIdentityData(user.documentPath);

    if (ocrResult.success && ocrResult.extractedData.isMatch) {
      // Status stays 'pending' as per requirements: "Pending → user completed OTP + document upload, waiting for admin"
      res.json({
        message: 'Document uploaded and passed initial OCR check. Waiting for admin approval.',
        status: user.status,
      });
    } else {
      res.status(400);
      throw new Error('OCR verification failed. The information on your document does not match your registration data.');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Connect Blockchain Wallet
// @route   POST /api/user/connect-wallet
// @access  Private
const connectWallet = async (req, res, next) => {
  try {
    res.status(400);
    throw new Error('Wallet linking after login is disabled. Wallet must be connected during registration.');
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        idNumber: user.idNumber,
        status: user.status,
        walletAddress: user.walletAddress,
        role: user.role,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  connectWallet,
  getProfile,
};
