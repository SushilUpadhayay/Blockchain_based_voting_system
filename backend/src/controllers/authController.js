const User = require('../models/User');
const Otp = require('../models/Otp');
const generateToken = require('../utils/generateToken');
const { generateOTP, sendOTP, hashOTP } = require('../services/otpService');
const { generateNonce, verifySignature } = require('../services/walletService');

// ============================================================================
// NOTE: All OTP storage has been migrated to a dedicated MongoDB 'Otp' collection.
// Security hardens added: OTP hashing (SHA-256), 60s resend cooldown, 
// and rigorous 5-attempt locking.
// ============================================================================

// @desc    Get dynamic wallet nonce for signature verification
// @route   GET /api/auth/nonce
// @access  Public
const getWalletNonce = async (req, res, next) => {
  try {
    const { walletAddress } = req.query;
    if (!walletAddress) {
      res.status(400);
      throw new Error('Wallet address is required to generate a challenge');
    }
    const nonceObj = await generateNonce(walletAddress);
    res.json(nonceObj);
  } catch (error) {
    next(error);
  }
};

// @desc    Initialize registration (send OTP)
// @route   POST /api/auth/register-init
// @access  Public
const registerInit = async (req, res, next) => {
  try {
    const { name, email, idNumber, dob, address, walletAddress, signature, message } = req.body;

    if (!walletAddress) {
      res.status(400);
      throw new Error('Wallet address is required for registration');
    }

    if (!signature || !message) {
      res.status(400);
      throw new Error('Cryptographic signature and original verification message are required');
    }

    // 1. Verify cryptographic proof of wallet ownership
    await verifySignature(walletAddress, signature, message);

    // 2. Proceed with checking if user/ID already exists
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
    }

    // 3. Enforce 60-second OTP resend cooldown
    const existingOtp = await Otp.findOne({ email: email.toLowerCase(), purpose: 'registration' });
    if (existingOtp) {
      const elapsedSeconds = Math.floor((Date.now() - existingOtp.createdAt.getTime()) / 1000);
      if (elapsedSeconds < 60) {
        const remainingSeconds = 60 - elapsedSeconds;
        res.status(429);
        throw new Error(`Please wait ${remainingSeconds} seconds before requesting a new OTP.`);
      }
      // Clean up previous OTP if cooldown expired
      await Otp.deleteOne({ _id: existingOtp._id });
    }

    // 4. Generate raw OTP, hash it, and store securely
    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    await Otp.create({
      email: email.toLowerCase(),
      otp: hashedOtp,
      purpose: 'registration',
      userData: { name, email, idNumber, dob, address, walletAddress },
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiration
    });

    // Send raw OTP asynchronously via email
    sendOTP({ email, name }, otp, 'registration').catch(err => {
      console.error('Failed to send registration OTP in background:', err);
    });

    res.status(200).json({
      message: 'OTP sent to your email. Please verify to complete registration.',
      email,
      cooldownSeconds: 60
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

    const record = await Otp.findOne({ 
      email: email.toLowerCase(), 
      purpose: 'registration' 
    });

    if (!record) {
      res.status(400);
      throw new Error('Registration session expired or not found. Please register again.');
    }

    if (record.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: record._id });
      res.status(401);
      throw new Error('OTP expired. Please register again.');
    }

    if (record.attempts >= 5) {
      await Otp.deleteOne({ _id: record._id });
      res.status(403);
      throw new Error('Too many failed attempts. Registration session locked.');
    }

    // Hash user input OTP to compare with hashed value in database
    const hashedInput = hashOTP(otp);
    if (record.otp !== hashedInput) {
      record.attempts += 1;
      await record.save();

      if (record.attempts >= 5) {
        await Otp.deleteOne({ _id: record._id });
        res.status(403);
        throw new Error('Too many failed attempts. Registration session locked.');
      }
      res.status(401);
      throw new Error(`Invalid OTP. ${5 - record.attempts} attempts remaining.`);
    }

    // OTP is valid. Check DB one last time to prevent race conditions
    let user = await User.findOne({ email });

    if (user) {
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
      user = await User.create({
        ...record.userData,
        status: 'pending',
        documentPath: 'pending_upload', 
      });
    }

    // Delete OTP record immediately upon successful verification
    await Otp.deleteOne({ _id: record._id });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      status: user.status,
      role: user.role,
      walletAddress: user.walletAddress,
      token: generateToken(user._id, user.role, user.walletAddress),
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

    if (user.status === 'blocked') {
      res.status(403);
      throw new Error('Access denied. This account has been permanently blocked.');
    }

    // Enforce rate-limit lockout and 60-second resend cooldown
    const existingOtp = await Otp.findOne({ 
      email: email.toLowerCase(), 
      purpose: 'login' 
    });
    if (existingOtp) {
      if (existingOtp.attempts >= 5 && existingOtp.expiresAt > new Date()) {
        res.status(429);
        throw new Error('Too many failed attempts. Please wait a few minutes before trying again.');
      }

      const elapsedSeconds = Math.floor((Date.now() - existingOtp.createdAt.getTime()) / 1000);
      if (elapsedSeconds < 60) {
        const remainingSeconds = 60 - elapsedSeconds;
        res.status(429);
        throw new Error(`Please wait ${remainingSeconds} seconds before requesting a new OTP.`);
      }

      // Delete expired/expired-cooldown OTP record
      await Otp.deleteOne({ _id: existingOtp._id });
    }

    // Generate, hash and save secure OTP
    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    await Otp.create({
      email: email.toLowerCase(),
      otp: hashedOtp,
      purpose: 'login',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // Send raw OTP asynchronously
    sendOTP(user, otp, 'login').catch(err => {
      console.error('Failed to send login OTP in background:', err);
    });

    let requireSignature = false;
    let walletAddress = null;
    let signMessage = null;

    if (user.walletAddress && user.role === 'user') {
      requireSignature = true;
      walletAddress = user.walletAddress;
      const nonceObj = await generateNonce(walletAddress);
      signMessage = nonceObj.message;
    }

    res.json({
      message: 'OTP sent successfully to your email',
      email: user.email,
      requireSignature,
      walletAddress,
      signMessage,
      cooldownSeconds: 60
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
    const { email, otp, signature, message } = req.body;

    if (!email || !otp) {
      res.status(400);
      throw new Error('Email and OTP are required');
    }

    const user = await User.findOne({ email });

    if (!user) {
      res.status(401);
      throw new Error('User not found');
    }

    const otpRecord = await Otp.findOne({ 
      email: email.toLowerCase(), 
      purpose: 'login' 
    });

    if (!otpRecord) {
      res.status(401);
      throw new Error('OTP session expired or not found. Please request a new one.');
    }

    if (otpRecord.attempts >= 5) {
      res.status(403);
      throw new Error('Account locked due to too many failed attempts. Please request a new OTP.');
    }

    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      res.status(401);
      throw new Error('OTP expired. Please request a new one.');
    }

    // Verify hashed input OTP against secure hash in database
    const hashedInput = hashOTP(otp);
    if (otpRecord.otp !== hashedInput) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      
      if (otpRecord.attempts >= 5) {
        res.status(403);
        throw new Error('Too many failed attempts. This OTP is now locked.');
      }

      res.status(401);
      throw new Error(`Invalid OTP. ${5 - otpRecord.attempts} attempts remaining.`);
    }

    // Cryptographic signature check for registered voters
    if (user.walletAddress && user.role === 'user') {
      if (!signature || !message) {
        res.status(400);
        throw new Error('Cryptographic wallet signature and verification message are required for login.');
      }
      await verifySignature(user.walletAddress, signature, message);
    }

    // Clear verification session immediately upon success
    await Otp.deleteOne({ _id: otpRecord._id });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      status: user.status,
      rejectionReason: user.rejectionReason,
      role: user.role,
      walletAddress: user.walletAddress,
      token: generateToken(user._id, user.role, user.walletAddress),
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

    // Enforce 60-second resend cooldown for voting OTP
    const existingOtp = await Otp.findOne({ email: user.email.toLowerCase(), purpose: 'voting' });
    if (existingOtp) {
      const elapsedSeconds = Math.floor((Date.now() - existingOtp.createdAt.getTime()) / 1000);
      if (elapsedSeconds < 60) {
        const remainingSeconds = 60 - elapsedSeconds;
        res.status(429);
        throw new Error(`Please wait ${remainingSeconds} seconds before requesting a new OTP.`);
      }
      await Otp.deleteOne({ _id: existingOtp._id });
    }

    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    await Otp.create({
      email: user.email.toLowerCase(),
      otp: hashedOtp,
      purpose: 'voting',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    sendOTP(user, otp, 'voting').catch(err => {
      console.error('Failed to send voting OTP in background:', err);
    });

    res.json({
      message: 'Voting OTP sent to your registered email',
      cooldownSeconds: 60
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

    const otpRecord = await Otp.findOne({ 
      email: user.email.toLowerCase(), 
      purpose: 'voting' 
    });

    if (!otpRecord) {
      res.status(401);
      throw new Error('Voting OTP session expired or not found. Please request a new one.');
    }

    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      res.status(401);
      throw new Error('OTP expired');
    }

    // Verify hashed voting OTP
    const hashedInput = hashOTP(otp);
    if (otpRecord.otp !== hashedInput) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      
      if (otpRecord.attempts >= 5) {
        await Otp.deleteOne({ _id: otpRecord._id });
        res.status(403);
        throw new Error('Too many failed attempts. This voting OTP is now locked.');
      }
      res.status(401);
      throw new Error(`Invalid OTP. ${5 - otpRecord.attempts} attempts remaining.`);
    }

    await Otp.deleteOne({ _id: otpRecord._id });

    res.json({
      success: true,
      message: 'OTP verified. You can now cast your vote.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWalletNonce,
  registerInit,
  verifyRegisterOtp,
  loginUser,
  verifyOtp,
  requestVoteOTP,
  verifyVoteOTP,
};
