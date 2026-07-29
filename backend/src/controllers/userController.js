const User = require('../models/User');
const { extractCitizenshipData } = require('../services/ocrService');
const { sendStatusNotificationEmail } = require('../services/otpService');
const { getRelevantRegistration, serializeSessionUserWithVerifierContacts } = require('../utils/userResponse');

// @desc    Upload citizenship front & back images, run OCR on back side
// @route   POST /api/user/upload-document
// @access  Private (JWT required)
const uploadDocument = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Validate both images are present
    const frontFile = req.files?.documentFront?.[0];
    const backFile  = req.files?.documentBack?.[0];

    if (!frontFile) {
      res.status(400);
      throw new Error('Please upload the front side of your citizenship document.');
    }
    if (!backFile) {
      res.status(400);
      throw new Error('Please upload the back side of your citizenship document.');
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const pendingRegistration = (user.elections || []).find((entry) => entry.status === 'pending');
    if (user.role !== 'user' || !pendingRegistration) {
      res.status(400);
      throw new Error(
        'Cannot upload document. Citizenship upload is only required for voters with a pending election registration.'
      );
    }

    // Save both file paths
    user.documentFrontPath = frontFile.path;
    user.documentBackPath  = backFile.path;
    // Keep documentPath pointing to front for backward compatibility
    user.documentPath = frontFile.path;

    // Run OCR on back side (English side) 
    const ocrResult = await extractCitizenshipData(backFile.path);

    if (ocrResult.success && ocrResult.extractedData) {
      const d = ocrResult.extractedData;
      user.ocrData = {
        citizenshipNumber:     d.citizenshipNumber     || null,
        fullName:              d.fullName              || null,
        gender:                d.gender                || null,
        dateOfBirth: {
          year:  d.dateOfBirth?.year  || null,
          month: d.dateOfBirth?.month || null,
          day:   d.dateOfBirth?.day   || null,
        },
        birthDistrict:         d.birthDistrict         || null,
        birthMunicipality:     d.birthMunicipality     || null,
        birthWardNo:           d.birthWardNo           || null,
        permanentDistrict:     d.permanentDistrict     || null,
        permanentMunicipality: d.permanentMunicipality || null,
        permanentWardNo:       d.permanentWardNo       || null,
        confidence:            d.confidence            ?? null,
        rawText:               d.rawText               || null,
        extractedAt:           d.extractedAt ? new Date(d.extractedAt) : new Date(),
        ocrSuccess:            true,
        ocrError:              null,
      };
    } else {
      // OCR failed — store the error, don't block the upload
      user.ocrData = {
        ocrSuccess: false,
        ocrError:   ocrResult.error || 'OCR processing failed',
        extractedAt: new Date(),
      };
    }

    await user.save();

    // Notify voters that their registration is awaiting verifier review.
    sendStatusNotificationEmail(user, 'pending').catch(err => {
      console.error('Failed to send pending status notification email:', err);
    });

    res.json({
      message: 'Citizenship documents uploaded successfully. Your application is under review.',
      status: getRelevantRegistration(user, pendingRegistration?.electionId)?.status || null,
      electionId: pendingRegistration?.electionId || null,
      ocrSuccess: user.ocrData.ocrSuccess,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Connect Blockchain Wallet (disabled post-registration)
// @route   POST /api/user/connect-wallet
// @access  Private
const connectWallet = async (req, res, next) => {
  try {
    res.status(400);
    throw new Error('Wallet linking after login is disabled. Wallet must be connected during registration.');
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json(await serializeSessionUserWithVerifierContacts(user));
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  connectWallet,
  getProfile,
};
