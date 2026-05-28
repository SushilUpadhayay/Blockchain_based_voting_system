const express = require('express');
const router = express.Router();
const { 
  registerInit, 
  verifyRegisterOtp,
  loginUser, 
  verifyOtp, 
  requestVoteOTP, 
  verifyVoteOTP,
  getWalletNonce
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validateNonceFetch,
  validateRegisterInit,
  validateVerifyRegisterOtp,
  validateLogin,
  validateVerifyOtp,
  validateVerifyVoteOtp
} = require('../middleware/validator');
const { authLimiter, nonceLimiter } = require('../middleware/rateLimiter');

router.get('/nonce', nonceLimiter, validateNonceFetch, getWalletNonce);
router.post('/register-init', authLimiter, validateRegisterInit, registerInit);
router.post('/verify-register-otp', authLimiter, validateVerifyRegisterOtp, verifyRegisterOtp);
router.post('/login', authLimiter, validateLogin, loginUser);
router.post('/verify-otp', authLimiter, validateVerifyOtp, verifyOtp);

// Voting OTP routes (protected)
router.post('/request-vote-otp', protect, authLimiter, requestVoteOTP);
router.post('/verify-vote-otp', protect, authLimiter, validateVerifyVoteOtp, verifyVoteOTP);

module.exports = router;

