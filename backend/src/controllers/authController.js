const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { generateOTP, sendOTP } = require('../services/otpService');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, idNumber } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { idNumber }] });

    if (userExists) {
      res.status(400);
      throw new Error('User with this email or ID number already exists');
    }

    const user = await User.create({
      name,
      email,
      idNumber,
      status: 'pending',
      // Document is uploaded in the next step
      documentPath: 'pending_upload', 
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        message: 'Registration successful. Please proceed to upload your ID document.',
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
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes from now
    await user.save();

    await sendOTP(user, otp);

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

    if (user.otp !== otp) {
      res.status(401);
      throw new Error('Invalid OTP');
    }

    if (user.otpExpires < Date.now()) {
      res.status(401);
      throw new Error('OTP expired');
    }

    // Clear OTP after successful use
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      status: user.status,
      role: user.role,
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
