const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { generateOTP } = require('../services/otpService');
const { sendOTP } = require('../services/smsService');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, phone, idNumber, dob, address, walletAddress } = req.body;

    if (!walletAddress) {
      res.status(400);
      throw new Error('Wallet address is required for registration');
    }

    const userExists = await User.findOne({ $or: [{ email }, { phone }, { idNumber }, { walletAddress }] });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists with provided details');
    }

    // Generate OTP for registration verification
    const otp = generateOTP();
    const otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes

    const user = await User.create({
      name,
      email,
      phone,
      idNumber,
      dob,
      address,
      walletAddress,
      status: 'pending',
      documentPath: 'pending_upload',
      otp,
      otpExpires
    });

    if (user) {
      // Send OTP via SMS
      await sendOTP(phone, otp);

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        message: 'Registration successful. OTP sent to your phone.',
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Request OTP for Login
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      res.status(401);
      throw new Error('User not found');
    }

    // STRICT FLOW: User MUST be approved
    if (user.status !== 'approved') {
      res.status(403);
      throw new Error(`Cannot login. Current status: ${user.status}`);
    }

    // Generate OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    user.otpAttempts = 0; // Reset attempts on new OTP request
    await user.save();

    await sendOTP(user.phone, otp);

    res.json({
      message: 'OTP sent successfully',
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

    const user = await User.findOne({ email });

    if (!user) {
      res.status(401);
      throw new Error('User not found');
    }

    if (user.otpAttempts >= 5) {
      res.status(403);
      throw new Error('Too many failed attempts. Please request a new OTP.');
    }

    if (user.otp !== otp) {
      user.otpAttempts += 1;
      await user.save();
      res.status(401);
      throw new Error(`Invalid OTP. ${5 - user.otpAttempts} attempts remaining.`);
    }

    if (user.otpExpires < Date.now()) {
      res.status(401);
      throw new Error('OTP expired');
    }

    // Clear OTP and reset attempts after successful use
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    
    // Mark user as verified if they were pending
    if (user.status === 'pending') {
      user.status = 'verified';
    }
    
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      status: user.status,
      role: user.role,
      walletAddress: user.walletAddress,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyOtp,
};
