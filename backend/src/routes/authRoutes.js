const express = require('express');
const router = express.Router();
const { 
  registerInit, 
  verifyRegisterOtp,
  loginUser, 
  adminLoginInit,
  verifyOtp, 
  requestVoteOTP, 
  verifyVoteOTP,
  registerVerifierInit,
  verifyVerifierOtp,
  registerSuperAdminInit,
  verifySuperAdminOtp,
  getWalletNonce
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validateNonceFetch,
  validateRegisterInit,
  validateVerifyRegisterOtp,
  validateLogin,
  validateAdminLogin,
  validateVerifyOtp,
  validateVerifierRegisterInit,
  validateVerifyVerifierOtp,
  validateSuperAdminRegisterInit,
  validateVerifySuperAdminOtp,
  validateVerifyVoteOtp
} = require('../middleware/validator');
const { authLimiter, nonceLimiter, registrationLimiter } = require('../middleware/rateLimiter');

router.get('/nonce', nonceLimiter, validateNonceFetch, getWalletNonce);
router.post('/register-init', registrationLimiter, authLimiter, validateRegisterInit, registerInit);
router.post('/verify-register-otp', authLimiter, validateVerifyRegisterOtp, verifyRegisterOtp);
router.post('/login', authLimiter, validateLogin, loginUser);
router.post('/admin-login', authLimiter, validateAdminLogin, adminLoginInit);
router.post('/verify-otp', authLimiter, validateVerifyOtp, verifyOtp);

// Voting OTP routes (protected)
router.post('/request-vote-otp', protect, authLimiter, requestVoteOTP);
router.post('/verify-vote-otp', protect, authLimiter, validateVerifyVoteOtp, verifyVoteOTP);

// Verifier self-registration routes (public)
router.post('/register-verifier-init', authLimiter, validateVerifierRegisterInit, registerVerifierInit);
router.post('/verify-verifier-otp', authLimiter, validateVerifyVerifierOtp, verifyVerifierOtp);

// Super Admin registration & wizard routes (public)
router.post('/register-superadmin-init', authLimiter, validateSuperAdminRegisterInit, registerSuperAdminInit);
router.post('/verify-superadmin-otp', authLimiter, validateVerifySuperAdminOtp, verifySuperAdminOtp);

module.exports = router;

