const { check, query, param, validationResult } = require('express-validator');

/**
 * Helper to intercept validation results and cleanly pass the first error message 
 * to the global Express error handler.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    // Extract the first clean error message and throw it to be caught by global errorHandler
    return next(new Error(errors.array()[0].msg));
  }
  next();
};

// Cryptographic Hex/Ethereum address format validator (starts with 0x and is 42 chars long)
const isEthereumAddress = (value) => {
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!ethRegex.test(value)) {
    throw new Error('Invalid Ethereum wallet address format');
  }
  return true;
};

// Cryptographic signature format validator (starts with 0x and is hex format)
const isEthSignature = (value) => {
  const sigRegex = /^0x[a-fA-F0-9]+$/;
  if (!sigRegex.test(value)) {
    throw new Error('Invalid cryptographic signature format');
  }
  return true;
};

// Authentication Input Validators

const validateNonceFetch = [
  query('walletAddress')
    .exists().withMessage('Wallet address query parameter is required')
    .bail()
    .custom(isEthereumAddress),
  validate
];

const validateRegisterInit = [
  check('name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  check('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  check('dob')
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Date of birth must be a valid ISO8601 date format (YYYY-MM-DD)'),

  check('gender')
    .trim()
    .notEmpty().withMessage('Gender is required')
    .isIn(['male', 'female', 'other']).withMessage('Gender must be one of: male, female, other'),

  check('address')
    .trim()
    .notEmpty().withMessage('Permanent address is required')
    .isLength({ min: 5, max: 300 }).withMessage('Address must be between 5 and 300 characters'),

  check('citizenshipNumber')
    .trim()
    .notEmpty().withMessage('Citizenship number is required')
    .isAlphanumeric('en-US', { ignore: ' -' }).withMessage('Citizenship number must be alphanumeric'),

  check('employeeId')
    .trim()
    .notEmpty().withMessage('Employee ID is required')
    .isAlphanumeric('en-US', { ignore: ' -' }).withMessage('Employee ID must be alphanumeric'),

  check('walletAddress')
    .exists().withMessage('Wallet address is required')
    .bail()
    .custom(isEthereumAddress),

  check('signature')
    .exists().withMessage('Cryptographic wallet signature is required')
    .bail()
    .custom(isEthSignature),

  check('message')
    .trim()
    .notEmpty().withMessage('Original signing verification challenge message is required'),

  check('inviteToken')
    .trim()
    .notEmpty().withMessage('Election invitation token is required'),

  validate
];

const validateVerifyRegisterOtp = [
  check('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),

  check('otp')
    .trim()
    .notEmpty().withMessage('6-digit OTP code is required')
    .isNumeric().withMessage('OTP must consist of numbers only')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits'),

  check('inviteToken')
    .trim()
    .notEmpty().withMessage('Election invitation token is required'),

  validate
];

const validateLogin = [
  check('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),

  validate
];

const validateAdminLogin = [
  check('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),

  check('password')
    .notEmpty().withMessage('Password is required'),

  validate
];

const validateVerifyOtp = [
  check('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),

  check('otp')
    .trim()
    .notEmpty().withMessage('6-digit OTP code is required')
    .isNumeric().withMessage('OTP must consist of numbers only')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits'),

  check('signature')
    .optional({ nullable: true })
    .custom(isEthSignature),

  check('message')
    .optional({ nullable: true })
    .trim()
    .notEmpty().withMessage('Verification challenge message cannot be empty if signature is provided'),

  validate
];

const validateVerifierRegisterInit = [
  check('inviteToken')
    .trim()
    .notEmpty().withMessage('Verifier invitation token is required'),

  check('name')
    .trim()
    .notEmpty().withMessage('Verifier full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Verifier name must be between 2 and 100 characters'),

  check('phone')
    .trim()
    .notEmpty().withMessage('Verifier phone number is required')
    .isLength({ min: 7, max: 30 }).withMessage('Phone number must be between 7 and 30 characters'),

  check('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),

  check('walletAddress')
    .exists().withMessage('Wallet address is required')
    .bail()
    .custom(isEthereumAddress),

  check('signature')
    .exists().withMessage('Cryptographic wallet signature is required')
    .bail()
    .custom(isEthSignature),

  check('message')
    .trim()
    .notEmpty().withMessage('Original signing verification challenge message is required'),

  validate
];

const validateVerifyVerifierOtp = [
  check('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),

  check('otp')
    .trim()
    .notEmpty().withMessage('6-digit OTP code is required')
    .isNumeric().withMessage('OTP must consist of numbers only')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits'),

  check('inviteToken')
    .trim()
    .notEmpty().withMessage('Verifier invitation token is required'),

  validate
];

const validateSuperAdminRegisterInit = [
  check('name')
    .trim()
    .notEmpty().withMessage('Super Admin full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  check('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  check('phone')
    .trim()
    .notEmpty().withMessage('Super Admin phone number is required')
    .isLength({ min: 7, max: 30 }).withMessage('Phone number must be between 7 and 30 characters'),

  check('address')
    .trim()
    .notEmpty().withMessage('Super Admin address is required')
    .isLength({ min: 5, max: 300 }).withMessage('Address must be between 5 and 300 characters'),

  check('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),

  check('walletAddress')
    .exists().withMessage('Wallet address is required')
    .bail()
    .custom(isEthereumAddress),

  check('signature')
    .exists().withMessage('Cryptographic wallet signature is required')
    .bail()
    .custom(isEthSignature),

  check('message')
    .trim()
    .notEmpty().withMessage('Original signing verification challenge message is required'),

  check('electionDetails.title')
    .trim()
    .notEmpty().withMessage('Election title is required'),

  check('electionDetails.description')
    .trim()
    .notEmpty().withMessage('Election description is required'),

  check('electionDetails.registrationPeriod.startDate')
    .notEmpty().withMessage('Registration start date is required')
    .isISO8601().withMessage('Registration start date must be a valid date'),

  check('electionDetails.registrationPeriod.endDate')
    .notEmpty().withMessage('Registration end date is required')
    .isISO8601().withMessage('Registration end date must be a valid date')
    .custom((value, { req }) => {
      const startDate = req.body?.electionDetails?.registrationPeriod?.startDate;
      if (startDate && new Date(value) <= new Date(startDate)) {
        throw new Error('Registration end date must be after the start date');
      }
      return true;
    }),

  check('electionDetails.votingPeriod.startDate')
    .notEmpty().withMessage('Election start date is required')
    .isISO8601().withMessage('Election start date must be a valid date'),

  check('electionDetails.votingPeriod.endDate')
    .notEmpty().withMessage('Election end date is required')
    .isISO8601().withMessage('Election end date must be a valid date')
    .custom((value, { req }) => {
      const startDate = req.body?.electionDetails?.votingPeriod?.startDate;
      if (startDate && new Date(value) <= new Date(startDate)) {
        throw new Error('Election end date must be after the start date');
      }
      return true;
    }),

  validate
];

const validateVerifySuperAdminOtp = [
  check('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),

  check('otp')
    .trim()
    .notEmpty().withMessage('6-digit OTP code is required')
    .isNumeric().withMessage('OTP must consist of numbers only')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits'),

  validate
];

const validateVerifyVoteOtp = [
  check('otp')
    .trim()
    .notEmpty().withMessage('6-digit voting OTP code is required')
    .isNumeric().withMessage('OTP must consist of numbers only')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits'),

  validate
];

// Administrative Input Validators

const validateMongoIdParam = [
  param('id')
    .isMongoId().withMessage('Invalid identity resource identifier format'),

  validate
];

const validateRejectUser = [
  param('id')
    .isMongoId().withMessage('Invalid identity resource identifier format'),

  check('reason')
    .trim()
    .notEmpty().withMessage('Rejection reason is required')
    .isLength({ min: 5, max: 500 }).withMessage('Rejection reason must be between 5 and 500 characters'),

  validate
];

const validateAddCandidate = [
  check('name')
    .trim()
    .notEmpty().withMessage('Candidate name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Candidate name must be between 2 and 100 characters'),

  validate
];

module.exports = {
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
  validateVerifyVoteOtp,
  validateMongoIdParam,
  validateRejectUser,
  validateAddCandidate
};
