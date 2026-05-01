const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { generateOTP, sendOTP } = require('../services/otpService');

// --- OTP Registration Cache ---
const pendingRegistrations = new Map();

// Auto-cleanup expired temporary registrations every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of pendingRegistrations.entries()) {
    if (data.expires < now) {
      pendingRegistrations.delete(email);
    }
  }
}, 5 * 60 * 1000);

// @desc    Initialize registration (send OTP)
// @route   POST /api/auth/register-init
// @access  Public
const registerInit = async (req, res, next) => {
  try {
    const { name, email, idNumber, dob, address, walletAddress } = req.body;

    if (!walletAddress) {
      res.status(400);
      throw new Error('Wallet address is required for registration');
    }

    const user = await User.findOne({ 
      $or: [
        { email }, 
        { idNumber }
      ] 
    });

    if (user) {
      if (user.status === 'registered') {
        res.status(400);
        throw new Error('This identity is already registered and authorized to vote.');
      }
      if (user.status === 'blocked') {
        res.status(403);
        throw new Error('This account has been permanently blocked.');
      }
      // If pending/rejected, we allow them to restart registration
    }

    const otp = generateOTP();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes
    
    pendingRegistrations.set(email, {
      userData: { name, email, idNumber, dob, address, walletAddress },
      otp,
      expires,
      attempts: 0
    });

    // Send OTP asynchronously (don't wait for it to block the response)
    sendOTP({ email, name }, otp, 'registration').catch(err => {
      console.error('Failed to send registration OTP in background:', err);
    });

    res.status(200).json({
      message: 'OTP sent to your email. Please verify to complete registration.',
      email
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP and finalize registration
// @route   POST /api/auth/verify-register-otp
// @access  Public
const verifyRegisterOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400);
      throw new Error('Email and OTP are required');
    }

    const record = pendingRegistrations.get(email);

    if (!record) {
      res.status(400);
      throw new Error('Registration session expired or not found. Please register again.');
    }

    if (record.expires < Date.now()) {
      pendingRegistrations.delete(email);
      res.status(401);
      throw new Error('OTP expired. Please register again.');
    }

    if (record.attempts >= 5) {
      pendingRegistrations.delete(email);
      res.status(403);
      throw new Error('Too many failed attempts. Registration session locked.');
    }

    if (record.otp !== otp) {
      record.attempts += 1;
      if (record.attempts >= 5) {
        pendingRegistrations.delete(email);
        res.status(403);
        throw new Error('Too many failed attempts. Registration session locked.');
      }
      res.status(401);
      throw new Error(`Invalid OTP. ${5 - record.attempts} attempts remaining.`);
    }

    // OTP is valid. Check DB one last time to prevent race conditions
    let user = await User.findOne({ email });

    if (user) {
      // User might be pending/rejected and just resubmitting
      user.name = record.userData.name;
      user.idNumber = record.userData.idNumber;
      user.dob = record.userData.dob;
      user.address = record.userData.address;
      user.walletAddress = record.userData.walletAddress;
      if (user.status === 'rejected') {
        user.status = 'pending';
        user.rejectionReason = undefined;
      }
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        ...record.userData,
        status: 'pending',
        documentPath: 'pending_upload', 
      });
    }

    // Clean up temporary record
    pendingRegistrations.delete(email);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      status: user.status,
      role: user.role,
      walletAddress: user.walletAddress,
      token: generateToken(user._id),
      message: 'Registration successful. Please proceed to upload your ID document.',
    });
  } catch (error) {
    next(error);
  }
};

// Helper for email validation
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// @desc    Request OTP for Login
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      res.status(400);
      throw new Error('Please provide a valid email address');
    }

    const user = await User.findOne({ email });

    if (!user) {
      res.status(401);
      throw new Error('User not found');
    }

    // Check if account is permanently blocked
    if (user.status === 'blocked') {
      res.status(403);
      throw new Error('Access denied. This account has been permanently blocked.');
    }

    // Rate-limit check BEFORE resetting — must check current attempts first
    // so the lockout actually fires. (Checking after reset would always pass.)
    if (user.otpAttempts >= 5 && user.otpExpires > Date.now()) {
      res.status(429);
      throw new Error('Too many failed attempts. Please wait a few minutes before trying again.');
    }

    // Generate OTP and reset attempt counter for the new code
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    user.otpAttempts = 0;
    await user.save();

    // Send OTP asynchronously to prevent blocking the response
    sendOTP(user, otp, 'login').catch(err => {
      console.error('Failed to send login OTP in background:', err);
    });

    res.json({
      message: 'OTP sent successfully to your email',
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP and Log in
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400);
      throw new Error('Email and OTP are required');
    }

    const user = await User.findOne({ email });

    if (!user) {
      res.status(401);
      throw new Error('User not found');
    }

    // Check if account is locked for too many attempts
    if (user.otpAttempts >= 5 && user.otpExpires > Date.now()) {
      res.status(403);
      throw new Error('Account locked due to too many failed attempts. Please request a new OTP.');
    }

    if (user.otpExpires < Date.now()) {
      res.status(401);
      throw new Error('OTP expired. Please request a new one.');
    }

    if (user.otp !== otp) {
      user.otpAttempts += 1;
      await user.save();
      
      if (user.otpAttempts >= 5) {
        res.status(403);
        throw new Error('Too many failed attempts. This OTP is now locked.');
      }

      res.status(401);
      throw new Error(`Invalid OTP. ${5 - user.otpAttempts} attempts remaining.`);
    }

    // Prevent reuse by checking if OTP is already used (optional if we clear it)
    // Clearing OTP and reset attempts after successful use
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      status: user.status,
      rejectionReason: user.rejectionReason,
      role: user.role,
      walletAddress: user.walletAddress,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request OTP for Voting
// @route   POST /api/auth/request-vote-otp
// @access  Private (Registered Voters only)
const requestVoteOTP = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    if (user.status !== 'registered') {
        res.status(403);
        throw new Error('Only registered and approved voters can request a voting OTP');
    }

    // Generate Voting OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    user.otpAttempts = 0;
    await user.save();

    // Send OTP asynchronously to prevent blocking the response
    sendOTP(user, otp, 'voting').catch(err => {
      console.error('Failed to send voting OTP in background:', err);
    });

    res.json({
      message: 'Voting OTP sent to your registered email',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Voting OTP
// @route   POST /api/auth/verify-vote-otp
// @access  Private (Registered Voters only)
const verifyVoteOTP = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    if (user.otpExpires < Date.now()) {
      res.status(401);
      throw new Error('OTP expired');
    }

    if (user.otp !== otp) {
      user.otpAttempts += 1;
      await user.save();
      res.status(401);
      throw new Error(`Invalid OTP. ${5 - user.otpAttempts} attempts remaining.`);
    }

    // Clear OTP after success
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save();

    res.json({
      success: true,
      message: 'OTP verified. You can now cast your vote.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerInit,
  verifyRegisterOtp,
  loginUser,
  verifyOtp,
  requestVoteOTP,
  verifyVoteOTP,
};
