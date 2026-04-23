const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  verifyOtp, 
  requestVoteOTP, 
  verifyVoteOTP 
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-otp', verifyOtp);

// Voting OTP routes (protected)
router.post('/request-vote-otp', protect, requestVoteOTP);
router.post('/verify-vote-otp', protect, verifyVoteOTP);

module.exports = router;
