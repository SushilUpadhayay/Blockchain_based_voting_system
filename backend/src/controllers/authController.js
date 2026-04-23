const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { generateOTP, sendOTP } = require('../services/otpService');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, idNumber, dob, address, walletAddress } = req.body;

    if (!walletAddress) {
      res.status(400);
      throw new Error('Wallet address is required for registration');
    }

    let user = await User.findOne({ 
      $or: [
        { email }, 
        { idNumber }, 
        { walletAddress }
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

      // If user is pending or rejected, we update their basic info and allow them to proceed
      user.name = name;
      user.email = email;
      user.idNumber = idNumber;
      user.dob = dob;
      user.address = address;
      user.walletAddress = walletAddress;
      
      // If they were rejected, resetting to pending as they are now "resubmitting"
      if (user.status === 'rejected') {
        user.status = 'pending';
        user.rejectionReason = undefined;
      }
      
      await user.save();

      return res.status(200).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        message: user.status === 'pending' ? 'Identity updated. Please proceed to upload documents.' : 'Resubmission started. Please upload your documents.',
      });
    }

    user = await User.create({
      name,
      email,
      idNumber,
      dob,
      address,
      walletAddress,
      status: 'pending',
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

    // Allow login for pending and rejected users to see their status
    // Only blocked users are strictly forbidden
    if (user.status === 'blocked') {
      res.status(403);
      throw new Error('Access denied. This account has been permanently blocked.');
    }

    // Generate OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    user.otpAttempts = 0; // Reset attempts on new OTP request
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
    // status remains 'pending' until admin approval
    
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

module.exports = {
  registerUser,
  loginUser,
  verifyOtp,
};
