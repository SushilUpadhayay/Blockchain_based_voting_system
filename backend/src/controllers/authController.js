const crypto = require('crypto');
const User = require('../models/User');
const Otp = require('../models/Otp');
const OtpLimit = require('../models/OtpLimit');
const VerifierInvite = require('../models/VerifierInvite');
const Election = require('../models/Election');
const VoterRoster = require('../models/VoterRoster');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const { generateOTP, sendOTP, hashOTP, sendElectionCreatedEmail, sendVerifierRoleConfirmationEmail } = require('../services/otpService');
const { generateNonce, verifySignature } = require('../services/walletService');
const { assignRegistrationVerifierOnChain, createElectionOnChain } = require('../services/blockchainService');
const { checkAndRecordOtpRequest } = require('../services/otpLimitService');
const { assertUserCanUseRole, getUserRoleKinds, normalizeEmail, normalizeWallet } = require('../utils/rolePolicy');
const { serializeSessionUserWithVerifierContacts } = require('../utils/userResponse');

// NOTE: All OTP storage has been migrated to a dedicated MongoDB 'Otp' collection.
// Security hardens added: OTP hashing (SHA-256), 60s resend cooldown, 
// and rigorous 5-attempt locking.
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
    const { name, email, citizenshipNumber, dob, gender, address, employeeId, walletAddress, signature, message, inviteToken } = req.body;
    const cleanEmail = normalizeEmail(email);
    const cleanWallet = normalizeWallet(walletAddress);

    if (!inviteToken) {
      res.status(400);
      throw new Error('Election invitation token is required for voter registration');
    }

    if (!cleanWallet) {
      res.status(400);
      throw new Error('Wallet address is required for registration');
    }

    if (!signature || !message) {
      res.status(400);
      throw new Error('Cryptographic signature and original verification message are required');
    }

    const election = await Election.findOne({ inviteToken });
    if (!election) {
      res.status(404);
      throw new Error('Invalid or expired election invitation link');
    }

    if (election.status !== 'registration_open') {
      res.status(400);
      throw new Error(`Registration for "${election.title}" is not currently open.`);
    }

    const electionId = Number(election.electionId);
    const roster = await VoterRoster.findOne({ electionId, email: cleanEmail });
    if (!roster) {
      res.status(403);
      throw new Error('This email is not on the voter roster for this election.');
    }

    if (roster.citizenshipNumber && roster.citizenshipNumber !== String(citizenshipNumber).trim()) {
      res.status(400);
      throw new Error('Citizenship number does not match this election roster.');
    }

    if (roster.dateOfBirth && roster.dateOfBirth !== String(dob).trim()) {
      res.status(400);
      throw new Error('Date of birth does not match this election roster.');
    }

    if (roster.employeeId && roster.employeeId !== String(employeeId).trim()) {
      res.status(400);
      throw new Error('Employee ID does not match this election roster.');
    }

    // 1. Verify cryptographic proof of wallet ownership
    await verifySignature(cleanWallet, signature, message);

    // 2. Enforce one wallet, one identity
    const walletOwner = await User.findOne({ walletAddress: cleanWallet });
    if (walletOwner && walletOwner.email.toLowerCase() !== cleanEmail) {
      res.status(409);
      throw new Error(
        'This wallet address is already linked to an existing account. ' +
        'Each wallet can only be associated with one identity.'
      );
    }

    // 3. Enforce one email, one role; voters may register for multiple elections as voters.
    const existingUser = await User.findOne({ email: cleanEmail });
    assertUserCanUseRole(existingUser, 'voter', res);

    const idOwner = await User.findOne({ citizenshipNumber: String(citizenshipNumber).trim() });
    if (idOwner && idOwner.email.toLowerCase() !== cleanEmail) {
      res.status(409);
      throw new Error('This citizenship number is already registered with another email.');
    }

    if (existingUser) {
      if (existingUser.citizenshipNumber && existingUser.citizenshipNumber !== String(citizenshipNumber).trim()) {
        res.status(409);
        throw new Error('This email is already linked to a different citizenship number.');
      }

      const existingReg = existingUser.getElectionRegistration(electionId);
      if (existingReg?.status === 'registered') {
        res.status(400);
        throw new Error('This email is already approved as a voter for this election.');
      }
      if (existingReg?.status === 'blocked') {
        res.status(403);
        throw new Error('This email is blocked from registering for this election.');
      }
    }

    const purposeKey = `registration_${electionId}`;

    // 4. Enforce OTP Rate Limiting
    const rateLimitResult = await checkAndRecordOtpRequest(cleanEmail, purposeKey);
    if (!rateLimitResult.allowed) {
      if (rateLimitResult.errorType === 'lockout') {
        const remainingMinutes = Math.ceil(rateLimitResult.remainingSeconds / 60);
        return res.status(429).json({
          message: `Too many registration attempts. Your account is locked out. Please try again in ${remainingMinutes} minutes.`,
          remainingSeconds: rateLimitResult.remainingSeconds
        });
      } else {
        return res.status(429).json({
          message: `Please wait ${rateLimitResult.remainingSeconds} seconds before requesting a new OTP.`,
          remainingSeconds: rateLimitResult.remainingSeconds
        });
      }
    }

    // Clean up any previous registration OTP for this email and election
    await Otp.deleteMany({ email: cleanEmail, purpose: purposeKey });

    // 5. Generate raw OTP, hash it, and store securely
    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    await Otp.create({
      email: cleanEmail,
      otp: hashedOtp,
      purpose: purposeKey,
      userData: {
        name,
        email: cleanEmail,
        citizenshipNumber: String(citizenshipNumber).trim(),
        dob,
        gender,
        address,
        employeeId: String(employeeId).trim(),
        walletAddress: cleanWallet,
        electionId,
        inviteToken,
      },
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiration
    });

    // Send raw OTP via email
    try {
      await sendOTP({ email: cleanEmail, name }, otp, `registration (Election ${electionId})`);
    } catch (err) {
      console.error('Failed to send registration OTP:', err);
      await Otp.deleteOne({ email: cleanEmail, purpose: purposeKey });
      res.status(500);
      throw new Error('Failed to send OTP email. Please verify your email address and try again.');
    }

    res.status(200).json({
      message: 'OTP sent to your email. Please verify to complete registration.',
      email: cleanEmail,
      electionId,
      cooldownSeconds: rateLimitResult.nextCooldownSeconds
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
    const { email, otp, inviteToken } = req.body;
    const cleanEmail = normalizeEmail(email);

    if (!email || !otp || !inviteToken) {
      res.status(400);
      throw new Error('Email, OTP, and election invitation token are required');
    }

    const election = await Election.findOne({ inviteToken });
    if (!election) {
      res.status(404);
      throw new Error('Invalid or expired election invitation link');
    }

    const electionId = Number(election.electionId);
    const purposeKey = `registration_${electionId}`;

    // Check if locked out in OtpLimit
    const limitDoc = await OtpLimit.findOne({ email: cleanEmail, purpose: purposeKey });
    if (limitDoc && limitDoc.lockoutUntil && limitDoc.lockoutUntil > new Date()) {
      const remainingMinutes = Math.ceil((limitDoc.lockoutUntil.getTime() - Date.now()) / (60 * 1000));
      res.status(429);
      throw new Error(`Your registration is locked out due to too many OTP requests. Please try again in ${remainingMinutes} minutes.`);
    }

    const record = await Otp.findOne({
      email: cleanEmail,
      purpose: purposeKey
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

    if (record.userData?.inviteToken !== inviteToken || Number(record.userData?.electionId) !== electionId) {
      await Otp.deleteOne({ _id: record._id });
      res.status(400);
      throw new Error('Registration session does not match this election invitation.');
    }

    const roster = await VoterRoster.findOne({ electionId, email: cleanEmail });
    if (!roster) {
      await Otp.deleteOne({ _id: record._id });
      res.status(403);
      throw new Error('This email is not on the voter roster for this election.');
    }
    if (roster.citizenshipNumber && roster.citizenshipNumber !== String(record.userData.citizenshipNumber).trim()) {
      await Otp.deleteOne({ _id: record._id });
      res.status(400);
      throw new Error('Citizenship number does not match this election roster.');
    }
    if (roster.dateOfBirth && roster.dateOfBirth !== String(record.userData.dob).trim()) {
      await Otp.deleteOne({ _id: record._id });
      res.status(400);
      throw new Error('Date of birth does not match this election roster.');
    }
    if (roster.employeeId && roster.employeeId !== String(record.userData.employeeId).trim()) {
      await Otp.deleteOne({ _id: record._id });
      res.status(400);
      throw new Error('Employee ID does not match this election roster.');
    }

    // OTP is valid. Create or update voter identity, then update only this election registration.
    let user = await User.findOne({ email: cleanEmail });
    assertUserCanUseRole(user, 'voter', res);

    const walletOwner = await User.findOne({ walletAddress: normalizeWallet(record.userData.walletAddress) });
    if (walletOwner && walletOwner.email.toLowerCase() !== cleanEmail) {
      res.status(409);
      throw new Error('This wallet address is already linked to another email.');
    }

    const idOwner = await User.findOne({ citizenshipNumber: record.userData.citizenshipNumber });
    if (idOwner && idOwner.email.toLowerCase() !== cleanEmail) {
      res.status(409);
      throw new Error('This citizenship number is already registered with another email.');
    }

    if (user) {
      const existingReg = user.getElectionRegistration(electionId);
      if (existingReg?.status === 'registered') {
        res.status(400);
        throw new Error('This email is already approved as a voter for this election.');
      }
      if (existingReg?.status === 'blocked') {
        res.status(403);
        throw new Error('This email is blocked from registering for this election.');
      }

      user.name = record.userData.name;
      user.citizenshipNumber = record.userData.citizenshipNumber;
      user.dob = record.userData.dob;
      user.gender = record.userData.gender;
      user.address = record.userData.address;
      user.employeeId = record.userData.employeeId;
      user.walletAddress = record.userData.walletAddress;
    } else {
      user = new User({
        ...record.userData,
        role: 'user',
        documentPath: 'pending_upload',
      });
    }

    user.setElectionRegistration(electionId, {
      status: 'pending',
      rejectionReason: null,
      approvedBy: null,
      approvedAt: null,
    });

    await user.save();

    await VoterRoster.updateOne(
      { _id: roster._id },
      { registeredUserId: user._id }
    );

    // Delete OTP record immediately upon successful verification
    await Otp.deleteOne({ _id: record._id });

    const userData = await serializeSessionUserWithVerifierContacts(user, electionId);

    res.status(201).json({
      ...userData,
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

const hasOnlyBlockedVoterRegistrations = (user) => {
  const registrations = user?.elections || [];
  return user?.role === 'user' && registrations.length > 0 && registrations.every((entry) => entry.status === 'blocked');
};

const getRequiredElectionDetails = (electionDetails, res) => {
  const title = String(electionDetails?.title || '').trim();
  const description = String(electionDetails?.description || '').trim();
  const registrationStart = electionDetails?.registrationPeriod?.startDate;
  const registrationEnd = electionDetails?.registrationPeriod?.endDate;
  const votingStart = electionDetails?.votingPeriod?.startDate;
  const votingEnd = electionDetails?.votingPeriod?.endDate;

  if (!title || !description || !registrationStart || !registrationEnd || !votingStart || !votingEnd) {
    res.status(400);
    throw new Error('Election title, description, registration dates, and election dates are all required');
  }

  const registrationStartDate = new Date(registrationStart);
  const registrationEndDate = new Date(registrationEnd);
  const votingStartDate = new Date(votingStart);
  const votingEndDate = new Date(votingEnd);

  if ([registrationStartDate, registrationEndDate, votingStartDate, votingEndDate].some((date) => Number.isNaN(date.getTime()))) {
    res.status(400);
    throw new Error('Registration and election dates must be valid dates');
  }

  if (registrationEndDate <= registrationStartDate) {
    res.status(400);
    throw new Error('Registration end date must be after the start date');
  }

  if (votingEndDate <= votingStartDate) {
    res.status(400);
    throw new Error('Election end date must be after the start date');
  }

  return {
    title,
    description,
    registrationPeriod: {
      startDate: registrationStartDate,
      endDate: registrationEndDate,
    },
    votingPeriod: {
      startDate: votingStartDate,
      endDate: votingEndDate,
    },
  };
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

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(401);
      throw new Error('User not registered. Please complete registration first.');
    }

    const roleKinds = getUserRoleKinds(user);
    if (!roleKinds.includes('voter')) {
      res.status(401);
      throw new Error('This email is not registered as a voter. Use Admin / Verifier login.');
    }

    if (hasOnlyBlockedVoterRegistrations(user)) {
      res.status(403);
      throw new Error('This voter account is blocked and cannot log in.');
    }

    if (!user.walletAddress) {
      res.status(400);
      throw new Error('Wallet not linked');
    }

    // Enforce rate-limit lockout and 60-second resend cooldown (only if there was at least one verification attempt)
    // Enforce OTP Rate Limiting
    const rateLimitResult = await checkAndRecordOtpRequest(email, 'login');
    if (!rateLimitResult.allowed) {
      if (rateLimitResult.errorType === 'lockout') {
        const remainingMinutes = Math.ceil(rateLimitResult.remainingSeconds / 60);
        return res.status(429).json({
          message: `Too many OTP requests. Your account is locked out. Please try again in ${remainingMinutes} minutes.`,
          remainingSeconds: rateLimitResult.remainingSeconds
        });
      } else {
        return res.status(429).json({
          message: `Please wait ${rateLimitResult.remainingSeconds} seconds before requesting a new OTP.`,
          remainingSeconds: rateLimitResult.remainingSeconds
        });
      }
    }

    // Clean up any previous login OTP for this email
    await Otp.deleteMany({ email: email.toLowerCase(), purpose: 'login' });

    // Generate, hash and save secure OTP
    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    await Otp.create({
      email: email.toLowerCase(),
      otp: hashedOtp,
      purpose: 'login',
      userData: {
        loginType: 'voter',
      },
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // Send raw OTP via email
    try {
      await sendOTP(user, otp, 'login');
    } catch (err) {
      console.error('Failed to send login OTP:', err);
      await Otp.deleteOne({ email: email.toLowerCase(), purpose: 'login' });
      res.status(500);
      throw new Error('Failed to send login OTP email. Please try again later.');
    }

    let requireSignature = false;
    let walletAddress = null;
    let signMessage = null;

    if (user.walletAddress) {
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
      cooldownSeconds: rateLimitResult.nextCooldownSeconds
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

    // Check if locked out in OtpLimit
    const limitDoc = await OtpLimit.findOne({ email: email.toLowerCase(), purpose: 'login' });
    if (limitDoc && limitDoc.lockoutUntil && limitDoc.lockoutUntil > new Date()) {
      const remainingMinutes = Math.ceil((limitDoc.lockoutUntil.getTime() - Date.now()) / (60 * 1000));
      res.status(429);
      throw new Error(`Your account is locked out due to too many OTP requests. Please try again in ${remainingMinutes} minutes.`);
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(401);
      throw new Error('User not registered. Please complete registration first.');
    }

    const roleKinds = getUserRoleKinds(user);
    const isVoterLogin = roleKinds.includes('voter');
    const isAdminOrVerifierLogin = roleKinds.some((role) => ['admin', 'superadmin', 'verifier'].includes(role));

    if (isVoterLogin && hasOnlyBlockedVoterRegistrations(user)) {
      res.status(403);
      throw new Error('This voter account is blocked and cannot log in.');
    }

    if (isVoterLogin && !user.walletAddress) {
      res.status(400);
      throw new Error('Wallet not linked');
    }

    const otpRecord = await Otp.findOne({
      email: email.toLowerCase(),
      purpose: 'login'
    });

    if (!otpRecord) {
      res.status(401);
      throw new Error('OTP session expired or not found. Please request a new one.');
    }

    if (isAdminOrVerifierLogin && otpRecord.userData?.loginType !== 'admin') {
      res.status(403);
      throw new Error('Admin and verifier login requires password verification first.');
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

    // Cryptographic signature check for voter login
    if (isVoterLogin) {
      if (!signature || !message) {
        res.status(400);
        throw new Error('Cryptographic wallet signature and verification message are required for login.');
      }
      await verifySignature(user.walletAddress, signature, message);
    }

    // Clear verification session immediately upon success
    await Otp.deleteOne({ _id: otpRecord._id });

    res.json({
      ...(await serializeSessionUserWithVerifierContacts(user)),
      token: generateToken(user._id, user.role, user.walletAddress),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request OTP for Voting in a specific election
// @route   POST /api/auth/request-vote-otp
// @access  Private (Registered Voters only)
const requestVoteOTP = async (req, res, next) => {
  try {
    const { electionId } = req.body;
    if (!electionId) {
      res.status(400);
      throw new Error('Election ID is required');
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const reg = user.getElectionRegistration(electionId);
    if (reg?.status === 'blocked') {
      res.status(403);
      throw new Error('This voter is blocked from this election');
    }
    if (!reg || reg.status !== 'registered') {
      res.status(403);
      throw new Error('Only registered and approved voters for this election can request a voting OTP');
    }

    const purposeKey = `voting_${electionId}`;

    // Enforce OTP Rate Limiting
    const rateLimitResult = await checkAndRecordOtpRequest(user.email, purposeKey);
    if (!rateLimitResult.allowed) {
      if (rateLimitResult.errorType === 'lockout') {
        const remainingMinutes = Math.ceil(rateLimitResult.remainingSeconds / 60);
        return res.status(429).json({
          message: `Too many voting OTP requests. Your account is locked out. Please try again in ${remainingMinutes} minutes.`,
          remainingSeconds: rateLimitResult.remainingSeconds
        });
      } else {
        return res.status(429).json({
          message: `Please wait ${rateLimitResult.remainingSeconds} seconds before requesting a new OTP.`,
          remainingSeconds: rateLimitResult.remainingSeconds
        });
      }
    }

    // Clean up any previous voting OTP for this election
    await Otp.deleteMany({ email: user.email.toLowerCase(), purpose: purposeKey });

    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    await Otp.create({
      email: user.email.toLowerCase(),
      otp: hashedOtp,
      purpose: purposeKey,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    try {
      await sendOTP(user, otp, `voting (Election ${electionId})`);
    } catch (err) {
      console.error('Failed to send voting OTP:', err);
      await Otp.deleteOne({ email: user.email.toLowerCase(), purpose: purposeKey });
      res.status(500);
      throw new Error('Failed to send voting OTP email. Please try again.');
    }

    res.json({
      message: 'Voting OTP sent to your registered email',
      cooldownSeconds: rateLimitResult.nextCooldownSeconds
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Voting OTP for a specific election
// @route   POST /api/auth/verify-vote-otp
// @access  Private (Registered Voters only)
const verifyVoteOTP = async (req, res, next) => {
  try {
    const { electionId, otp } = req.body;
    if (!electionId || !otp) {
      res.status(400);
      throw new Error('Election ID and OTP are required');
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const reg = user.getElectionRegistration(electionId);
    if (reg?.status === 'blocked') {
      res.status(403);
      throw new Error('This voter is blocked from this election');
    }
    if (!reg || reg.status !== 'registered') {
      res.status(403);
      throw new Error('Only registered and approved voters for this election can verify a voting OTP');
    }

    const purposeKey = `voting_${electionId}`;

    // Check if locked out in OtpLimit
    const limitDoc = await OtpLimit.findOne({ email: user.email.toLowerCase(), purpose: purposeKey });
    if (limitDoc && limitDoc.lockoutUntil && limitDoc.lockoutUntil > new Date()) {
      const remainingMinutes = Math.ceil((limitDoc.lockoutUntil.getTime() - Date.now()) / (60 * 1000));
      res.status(429);
      throw new Error(`Your voting access is locked out due to too many OTP requests. Please try again in ${remainingMinutes} minutes.`);
    }

    const otpRecord = await Otp.findOne({
      email: user.email.toLowerCase(),
      purpose: purposeKey
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

// @desc    Request OTP for Admin / Verifier Login (Email + Password check first)
// @route   POST /api/auth/admin-login
// @access  Public
const adminLoginInit = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Email and password are required');
    }

    // Explicitly include +password since password field is select: false by default
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    const roleKinds = getUserRoleKinds(user);
    const isAdminOrVerifier = roleKinds.some((role) => ['admin', 'superadmin', 'verifier'].includes(role));
    if (!user || !isAdminOrVerifier) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    // Reuse existing OTP rate-limiting and send logic
    const rateLimitResult = await checkAndRecordOtpRequest(user.email, 'login');
    if (!rateLimitResult.allowed) {
      if (rateLimitResult.errorType === 'lockout') {
        const remainingMinutes = Math.ceil(rateLimitResult.remainingSeconds / 60);
        return res.status(429).json({
          message: `Too many OTP requests. Account locked for ${remainingMinutes} minutes.`,
          remainingSeconds: rateLimitResult.remainingSeconds,
        });
      } else {
        return res.status(429).json({
          message: `Please wait ${rateLimitResult.remainingSeconds} seconds before requesting a new OTP.`,
          remainingSeconds: rateLimitResult.remainingSeconds,
        });
      }
    }

    await Otp.deleteMany({ email: user.email.toLowerCase(), purpose: 'login' });

    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    await Otp.create({
      email: user.email.toLowerCase(),
      otp: hashedOtp,
      purpose: 'login',
      userData: {
        loginType: 'admin',
      },
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOTP(user, otp, 'login');

    res.json({
      message: 'Password verified. OTP sent to your email.',
      email: user.email,
      requireSignature: false,
      cooldownSeconds: rateLimitResult.nextCooldownSeconds,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Initialize verifier registration (validate invite token, wallet signature, send OTP)
// @route   POST /api/auth/register-verifier-init
// @access  Public
const registerVerifierInit = async (req, res, next) => {
  try {
    const { inviteToken, inviteCode, name, phone, password, walletAddress, signature, message } = req.body;
    const cleanName = String(name || '').trim();
    const cleanPhone = String(phone || '').trim();
    const cleanInviteCode = String(inviteCode || '').trim().toUpperCase();

    if (!inviteToken || !cleanInviteCode || !cleanName || !cleanPhone || !walletAddress || !signature || !message || !password) {
      res.status(400);
      throw new Error('Verifier name, phone, invitation token, invitation code, password, wallet address, signature, and message are all required');
    }

    // 1. Validate invite
    const invite = await VerifierInvite.findOne({ token: inviteToken, status: 'pending' });
    if (!invite) {
      res.status(400);
      throw new Error('Invalid or expired verifier invitation');
    }

    const election = await Election.findOne({ electionId: invite.electionId });
    const regEndDate = election?.registrationPeriod?.endDate ? new Date(election.registrationPeriod.endDate) : null;
    const isExpired = (regEndDate && new Date() > regEndDate) || (invite.expiresAt && new Date() > new Date(invite.expiresAt));

    if (isExpired) {
      if (invite.status !== 'expired') {
        invite.status = 'expired';
        await invite.save();
      }
      res.status(400);
      throw new Error('This verifier invitation link has expired because the election registration period has ended.');
    }

    // 2. Validate one-time invitation code using constant-time hash comparison and 5-attempt limit
    if (invite.codeAttempts >= 5) {
      if (invite.status !== 'revoked') {
        invite.status = 'revoked';
        await invite.save();
      }
      res.status(403);
      throw new Error('Too many failed invitation code attempts. This verifier invitation has been locked for security.');
    }

    const isMatch = VerifierInvite.verifyInviteCode(cleanInviteCode, invite.hashedInviteCode);
    if (!isMatch) {
      invite.codeAttempts = (invite.codeAttempts || 0) + 1;
      if (invite.codeAttempts >= 5) {
        invite.status = 'revoked';
        await invite.save();
        res.status(403);
        throw new Error('Too many failed invitation code attempts. This verifier invitation has been locked for security.');
      }
      await invite.save();
      res.status(400);
      throw new Error(`Invalid one-time invitation code. ${5 - invite.codeAttempts} attempts remaining.`);
    }

    const email = normalizeEmail(invite.email);
    const cleanWallet = normalizeWallet(walletAddress);

    // 3. Verify cryptographic wallet signature
    await verifySignature(cleanWallet, signature, message);

    // 3. Role and wallet consistency checks. Verifiers may serve multiple elections,
    //    but one email cannot be both voter, verifier, and super admin.
    const existingUser = await User.findOne({ email });
    assertUserCanUseRole(existingUser, 'verifier', res);

    const voterRosterEntry = await VoterRoster.findOne({ email });
    if (voterRosterEntry) {
      res.status(409);
      throw new Error('This email is already reserved as a voter and cannot be used as a verifier.');
    }

    const walletOwner = await User.findOne({ walletAddress: cleanWallet });
    if (walletOwner && walletOwner.email.toLowerCase() !== email) {
      res.status(409);
      throw new Error('This wallet address is already linked to another registered email.');
    }

    // 4. Wallet consistency check: if the email already has an account,
    //    the wallet address must match exactly — do not allow overwriting an existing wallet.
    if (existingUser && existingUser.walletAddress) {
      if (existingUser.walletAddress.toLowerCase() !== cleanWallet) {
        res.status(400);
        throw new Error(
          `This email is already associated with wallet ${existingUser.walletAddress.slice(0, 6)}...${existingUser.walletAddress.slice(-4)}. ` +
          `Please connect the same wallet to complete verifier registration.`
        );
      }
    }

    // 5. Hash password BEFORE storing in Otp.userData — never store plaintext
    const hashedPassword = await bcrypt.hash(password, 10);

    const purposeKey = `verifier_registration_${invite.electionId}`;

    // 6. OTP rate limiting
    const rateLimitResult = await checkAndRecordOtpRequest(email, purposeKey);
    if (!rateLimitResult.allowed) {
      const remaining = rateLimitResult.remainingSeconds;
      return res.status(429).json({
        message: rateLimitResult.errorType === 'lockout'
          ? `Too many attempts. Locked for ${Math.ceil(remaining / 60)} minutes.`
          : `Please wait ${remaining} seconds before requesting a new OTP.`,
        remainingSeconds: remaining,
      });
    }

    await Otp.deleteMany({ email, purpose: purposeKey });

    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    await Otp.create({
      email,
      otp: hashedOtp,
      purpose: purposeKey,
      userData: {
        electionId: invite.electionId,
        inviteToken,
        name: cleanName,
        email,
        phone: cleanPhone,
        hashedPassword,   // stored as bcrypt hash, never plaintext
        walletAddress: cleanWallet,
      },
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOTP({ email, name: invite.name }, otp, 'verifier registration');

    res.json({
      message: 'Password verified. OTP sent to your email. Verify to complete verifier registration.',
      email,
      cooldownSeconds: rateLimitResult.nextCooldownSeconds,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP and complete verifier registration (triggers on-chain assignment)
// @route   POST /api/auth/verify-verifier-otp
// @access  Public
const verifyVerifierOtp = async (req, res, next) => {
  try {
    const { email, otp, inviteToken } = req.body;
    const cleanEmail = normalizeEmail(email);

    if (!email || !otp || !inviteToken) {
      res.status(400);
      throw new Error('Email, OTP, and verifier invitation token are required');
    }

    const invite = await VerifierInvite.findOne({ token: inviteToken, status: 'pending' });
    if (!invite) {
      res.status(400);
      throw new Error('Invalid or expired verifier invitation');
    }

    const election = await Election.findOne({ electionId: invite.electionId });
    const regEndDate = election?.registrationPeriod?.endDate ? new Date(election.registrationPeriod.endDate) : null;
    const isExpired = (regEndDate && new Date() > regEndDate) || (invite.expiresAt && new Date() > new Date(invite.expiresAt));

    if (isExpired) {
      if (invite.status !== 'expired') {
        invite.status = 'expired';
        await invite.save();
      }
      res.status(400);
      throw new Error('This verifier invitation link has expired because the election registration period has ended.');
    }

    if (invite.email.toLowerCase() !== cleanEmail) {
      res.status(400);
      throw new Error('Verifier invitation does not belong to this email.');
    }

    const purposeKey = `verifier_registration_${invite.electionId}`;
    const record = await Otp.findOne({ email: cleanEmail, purpose: purposeKey });
    if (!record || record.expiresAt < new Date()) {
      res.status(400);
      throw new Error('Session expired or not found. Please start registration again.');
    }

    if (record.attempts >= 5) {
      await Otp.deleteOne({ _id: record._id });
      res.status(403);
      throw new Error('Too many failed attempts. Registration session locked.');
    }

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

    const {
      electionId,
      inviteToken: recordInviteToken,
      name,
      phone,
      hashedPassword,
      walletAddress,
    } = record.userData;
    const cleanName = String(name || '').trim();
    const cleanPhone = String(phone || '').trim();
    if (!cleanName || !cleanPhone || !hashedPassword || !walletAddress) {
      res.status(400);
      throw new Error('Verifier registration session is missing required account details. Please restart registration.');
    }

    if (recordInviteToken !== inviteToken || Number(electionId) !== Number(invite.electionId)) {
      await Otp.deleteOne({ _id: record._id });
      res.status(400);
      throw new Error('Verifier registration session does not match this invitation.');
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    assertUserCanUseRole(existingUser, 'verifier', res);

    const voterRosterEntry = await VoterRoster.findOne({ email: cleanEmail });
    if (voterRosterEntry) {
      res.status(409);
      throw new Error('This email is already reserved as a voter and cannot be used as a verifier.');
    }

    const walletOwner = await User.findOne({ walletAddress });
    if (walletOwner && walletOwner.email.toLowerCase() !== cleanEmail) {
      res.status(409);
      throw new Error('This wallet address is already linked to another registered email.');
    }

    // 1. Assign on-chain FIRST — if this fails, no DB changes are made (blockchain-first principle)
    await assignRegistrationVerifierOnChain(electionId, walletAddress);

    // 2. Create or update User record only after on-chain assignment succeeds
    let user = existingUser;
    if (!user) {
      user = new User({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        password: hashedPassword,
        walletAddress,
        role: 'admin',
        adminRoles: [],
      });
    } else {
      // Only update non-wallet fields; wallet consistency was enforced in registerVerifierInit
      user.name = cleanName;
      user.phone = cleanPhone;
      user.password = hashedPassword;
    }

    // 3. Add per-election verifier role via helper
    user.addElectionRole(electionId, 'verifier');
    await user.save();

    // 4. Update Election document verifiers array
    const election = await Election.findOne({ electionId });
    if (election) {
      const vLower = walletAddress.toLowerCase();
      if (!election.verifiers.includes(vLower)) {
        election.verifiers.push(vLower);
        await election.save();
      }
    }

    // 5. Mark invitation as accepted
    await VerifierInvite.updateOne({ token: recordInviteToken }, { status: 'accepted' });

    // 6. Clean up OTP record
    await Otp.deleteOne({ _id: record._id });

    // 7. Send role-confirmation email (fire-and-forget, non-blocking)
    sendVerifierRoleConfirmationEmail({
      email: user.email,
      name: user.name,
      electionTitle: election?.title || `Election #${electionId}`,
      electionId,
    }).catch((err) => console.error('[authController] sendVerifierRoleConfirmationEmail failed:', err.message));

    res.status(201).json({
      message: 'Verifier registration complete! You are now authorized on the blockchain.',
      ...(await serializeSessionUserWithVerifierContacts(user, electionId)),
      token: generateToken(user._id, user.role, user.walletAddress),
      electionId,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Initialize Election Administrator self-registration & election wizard (sends OTP)
// @route   POST /api/auth/register-superadmin-init
// @access  Public
const registerSuperAdminInit = async (req, res, next) => {
  try {
    const { name, email, phone, address, password, walletAddress, signature, message, electionDetails } = req.body;
    const cleanName = String(name || '').trim();
    const cleanPhone = String(phone || '').trim();
    const cleanAddress = String(address || '').trim();

    if (!cleanName || !email || !cleanPhone || !cleanAddress || !password || !walletAddress || !signature || !message) {
      res.status(400);
      throw new Error('Name, email, phone, address, password, wallet address, signature, and message are required');
    }

    const cleanElectionDetails = getRequiredElectionDetails(electionDetails, res);

    const cleanEmail = email.toLowerCase().trim();
    const cleanWallet = normalizeWallet(walletAddress);

    // 1. Verify cryptographic proof of wallet ownership
    await verifySignature(cleanWallet, signature, message);

    // 2. Role and wallet consistency checks. An Election Administrator may create multiple
    //    elections, but the same email cannot also be voter or verifier.
    const existingUserByEmail = await User.findOne({ email: cleanEmail });
    assertUserCanUseRole(existingUserByEmail, 'superadmin', res);

    const voterRosterEntry = await VoterRoster.findOne({ email: cleanEmail });
    if (voterRosterEntry) {
      res.status(409);
      throw new Error('This email is already reserved as a voter and cannot be used as an Election Administrator.');
    }

    const verifierInvite = await VerifierInvite.findOne({
      email: cleanEmail,
      status: { $in: ['pending', 'accepted'] },
    });
    if (verifierInvite) {
      res.status(409);
      throw new Error('This email is already reserved as a Registration Verifier and cannot be used as an Election Administrator.');
    }

    if (existingUserByEmail && existingUserByEmail.walletAddress) {
      if (existingUserByEmail.walletAddress.toLowerCase() !== cleanWallet) {
        res.status(400);
        throw new Error(
          `This email is already associated with wallet ${existingUserByEmail.walletAddress.slice(0, 6)}...${existingUserByEmail.walletAddress.slice(-4)}.`
        );
      }
    }

    const existingUserByWallet = await User.findOne({ walletAddress: cleanWallet });
    if (existingUserByWallet && existingUserByWallet.email.toLowerCase() !== cleanEmail) {
      res.status(409);
      throw new Error('This wallet address is already linked to another registered email.');
    }

    // 3. Pre-hash password before storing in Otp.userData
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Rate limit check
    const rateLimitResult = await checkAndRecordOtpRequest(cleanEmail, 'superadmin_registration');
    if (!rateLimitResult.allowed) {
      const remaining = rateLimitResult.remainingSeconds;
      return res.status(429).json({
        message: rateLimitResult.errorType === 'lockout'
          ? `Too many attempts. Locked for ${Math.ceil(remaining / 60)} minutes.`
          : `Please wait ${remaining} seconds before requesting a new OTP.`,
        remainingSeconds: remaining,
      });
    }

    await Otp.deleteMany({ email: cleanEmail, purpose: 'superadmin_registration' });

    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    await Otp.create({
      email: cleanEmail,
      otp: hashedOtp,
      purpose: 'superadmin_registration',
      userData: {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        address: cleanAddress,
        hashedPassword,
        walletAddress: cleanWallet,
        electionDetails: cleanElectionDetails,
      },
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOTP({ email: cleanEmail, name: cleanName }, otp, 'Election Administrator registration');

    res.json({
      message: 'OTP sent to your email. Verify to deploy election and complete registration.',
      email: cleanEmail,
      cooldownSeconds: rateLimitResult.nextCooldownSeconds,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP, finalize Election Administrator registration, and deploy election on-chain
// @route   POST /api/auth/verify-superadmin-otp
// @access  Public
const verifySuperAdminOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400);
      throw new Error('Email and OTP are required');
    }

    const cleanEmail = email.toLowerCase().trim();
    const record = await Otp.findOne({ email: cleanEmail, purpose: 'superadmin_registration' });
    if (!record || record.expiresAt < new Date()) {
      res.status(400);
      throw new Error('Session expired or not found. Please restart election creation.');
    }

    if (record.attempts >= 5) {
      await Otp.deleteOne({ _id: record._id });
      res.status(403);
      throw new Error('Too many failed attempts. Registration session locked.');
    }

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

    const { name, phone, address, hashedPassword, walletAddress, electionDetails } = record.userData;
    const cleanName = String(name || '').trim();
    const cleanPhone = String(phone || '').trim();
    const cleanAddress = String(address || '').trim();
    if (!cleanName || !cleanPhone || !cleanAddress || !hashedPassword || !walletAddress) {
      res.status(400);
      throw new Error('Election Administrator registration session is missing required account details. Please restart registration.');
    }

    const cleanElectionDetails = getRequiredElectionDetails(electionDetails, res);
    const existingUserForRole = await User.findOne({ email: cleanEmail });
    assertUserCanUseRole(existingUserForRole, 'superadmin', res);

    const voterRosterEntry = await VoterRoster.findOne({ email: cleanEmail });
    if (voterRosterEntry) {
      res.status(409);
      throw new Error('This email is already reserved as a voter and cannot be used as an Election Administrator.');
    }

    const verifierInvite = await VerifierInvite.findOne({
      email: cleanEmail,
      status: { $in: ['pending', 'accepted'] },
    });
    if (verifierInvite) {
      res.status(409);
      throw new Error('This email is already reserved as a Registration Verifier and cannot be used as an Election Administrator.');
    }

    const walletOwner = await User.findOne({ walletAddress });
    if (walletOwner && walletOwner.email.toLowerCase() !== cleanEmail) {
      res.status(409);
      throw new Error('This wallet address is already linked to another registered email.');
    }

    // 1. Create or update User record without setting role='admin' directly (addElectionRole does this)
    let user = existingUserForRole;
    if (!user) {
      user = new User({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        address: cleanAddress,
        password: hashedPassword,
        walletAddress,
        adminRoles: [],
      });
    } else {
      user.name = cleanName;
      user.phone = cleanPhone;
      user.address = cleanAddress;
      user.password = hashedPassword;
    }

    // 2. Deploy election on-chain
    const onChainResult = await createElectionOnChain(cleanElectionDetails.title);
    const electionId = onChainResult.electionId;

    // 3. Add per-election superadmin role (promotes top-level user.role to 'admin' automatically)
    user.addElectionRole(electionId, 'superadmin');
    await user.save();

    // 4. Create Election document
    const inviteToken = crypto.randomBytes(16).toString('hex');
    const election = await Election.create({
      electionId,
      title: cleanElectionDetails.title,
      description: cleanElectionDetails.description,
      superAdmin: walletAddress.toLowerCase(),
      verifiers: [],
      registrationPeriod: cleanElectionDetails.registrationPeriod,
      votingPeriod: cleanElectionDetails.votingPeriod,
      status: 'draft',
      inviteToken,
    });

    // 5. Clean up OTP session
    await Otp.deleteOne({ _id: record._id });

    // 6. Send Election Created confirmation email (fire-and-forget, non-blocking)
    sendElectionCreatedEmail({
      email: user.email,
      name: user.name,
      electionTitle: election.title,
      electionId: election.electionId,
      txHash: onChainResult.txHash,
    }).catch((err) => console.error('[authController] sendElectionCreatedEmail failed:', err.message));

    res.status(201).json({
      message: 'Election Administrator account created and election successfully deployed on-chain!',
      ...(await serializeSessionUserWithVerifierContacts(user, electionId)),
      token: generateToken(user._id, user.role, user.walletAddress),
      electionId: election.electionId,
      txHash: onChainResult.txHash,
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
  adminLoginInit,
  verifyOtp,
  requestVoteOTP,
  verifyVoteOTP,
  registerVerifierInit,
  verifyVerifierOtp,
  registerSuperAdminInit,
  verifySuperAdminOtp,
};
