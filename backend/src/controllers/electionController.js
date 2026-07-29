const crypto = require('crypto');
const xlsx = require('xlsx');
const Election = require('../models/Election');
const VoterRoster = require('../models/VoterRoster');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const VerifierInvite = require('../models/VerifierInvite');
const { sendRosterInvitationEmail, sendVerifierInvitationEmail, sendElectionCreatedEmail } = require('../services/otpService');
const { assertUserCanUseRole, getRoleConflict, normalizeEmail } = require('../utils/rolePolicy');
const {
  createElectionOnChain,
  addCandidateOnChain,
  assignRegistrationVerifierOnChain,
  removeRegistrationVerifierOnChain,
  startElectionOnChain,
  endElectionOnChain,
  getCandidatesFromChain,
  getElectionStatusOnChain,
  getWinnerFromChain,
} = require('../services/blockchainService');

const getCandidatesWithMetadata = async (electionId) => {
  const chainCandidates = await getCandidatesFromChain(electionId);
  const chainIds = chainCandidates.map((c) => c.id);

  await Candidate.syncWithChain(electionId, chainIds);

  const metaDocs = await Candidate.find({ electionId, candidateId: { $in: chainIds } });
  const metaMap = {};
  metaDocs.forEach((doc) => {
    metaMap[doc.candidateId] = doc;
  });

  return chainCandidates.map((candidate) => ({
    ...candidate,
    party: metaMap[candidate.id]?.party || '',
    photoPath: metaMap[candidate.id]?.photoPath || null,
  }));
};

// @desc    Create a new election (records election deployed on-chain via MetaMask)
// @route   POST /api/elections
// @access  Private
const createElection = async (req, res, next) => {
  try {
    const { title, description, registrationPeriod, votingPeriod, electionId: customId, txHash: customTxHash } = req.body;
    if (!title) {
      res.status(400);
      throw new Error('Election title is required');
    }

    assertUserCanUseRole(req.user, 'superadmin', res);

    const cleanUserEmail = normalizeEmail(req.user?.email);
    const voterRosterEntry = await VoterRoster.findOne({ email: cleanUserEmail });
    if (voterRosterEntry) {
      res.status(409);
      throw new Error('This email is already reserved as a voter and cannot be used as a Super Admin.');
    }

    const verifierInvite = await VerifierInvite.findOne({
      email: cleanUserEmail,
      status: { $in: ['pending', 'accepted'] },
    });
    if (verifierInvite) {
      res.status(409);
      throw new Error('This email is already reserved as a Registration Verifier and cannot be used as a Super Admin.');
    }

    const superAdminWallet = req.user?.walletAddress || process.env.PUBLIC_KEY;
    if (!superAdminWallet) {
      res.status(400);
      throw new Error('Wallet address required to create election');
    }

    let electionId = customId ? Number(customId) : null;
    let txHash = customTxHash || null;

    // Fallback: If frontend did not pass pre-assigned on-chain electionId & txHash, deploy via backend service
    if (!electionId) {
      const onChainResult = await createElectionOnChain(title);
      electionId = onChainResult.electionId;
      txHash = onChainResult.txHash;
    }

    // Generate unique inviteToken
    const inviteToken = crypto.randomBytes(16).toString('hex');

    // Create MongoDB document
    const election = await Election.create({
      electionId,
      title,
      description: description || '',
      superAdmin: superAdminWallet.toLowerCase(),
      verifiers: [],
      registrationPeriod: registrationPeriod || {},
      votingPeriod: votingPeriod || {},
      status: 'draft',
      inviteToken,
    });

    req.user.addElectionRole(electionId, 'superadmin');
    await req.user.save();

    sendElectionCreatedEmail({
      email: req.user.email,
      name: req.user.name,
      electionTitle: election.title,
      electionId: election.electionId,
      txHash,
    }).catch((err) => console.error('[electionController] sendElectionCreatedEmail failed:', err.message));

    res.status(201).json({
      message: 'Election created successfully',
      election,
      txHash,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all elections
// @route   GET /api/elections
// @access  Public / Private
const getElections = async (req, res, next) => {
  try {
    const elections = await Election.find({}).sort({ createdAt: -1 });
    res.json(elections);
  } catch (error) {
    next(error);
  }
};

// @desc    Get basic election details by inviteToken for voter registration
// @route   GET /api/elections/by-token/:inviteToken
// @access  Public
const getElectionByToken = async (req, res, next) => {
  try {
    const { inviteToken } = req.params;
    if (!inviteToken) {
      res.status(400);
      throw new Error('Invitation token is required');
    }

    const election = await Election.findOne({ inviteToken });
    if (!election) {
      res.status(404);
      throw new Error('Invalid or expired invitation link');
    }

    res.json({
      electionId: election.electionId,
      title: election.title,
      status: election.status,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate verifier invite token and return invite metadata
// @route   GET /api/elections/verifier-invite/:token
// @access  Public
const getVerifierInviteByToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    const invite = await VerifierInvite.findOne({ token });

    if (!invite) {
      res.status(404);
      throw new Error('Invalid or expired verifier invitation link');
    }

    if (invite.status === 'accepted') {
      res.status(400);
      throw new Error('This verifier invitation has already been accepted.');
    }

    if (invite.expiresAt < new Date()) {
      invite.status = 'expired';
      await invite.save();
      res.status(400);
      throw new Error('This verifier invitation link has expired.');
    }

    const election = await Election.findOne({ electionId: invite.electionId });

    res.json({
      electionId: invite.electionId,
      electionTitle: election ? election.title : `Election #${invite.electionId}`,
      name: invite.name,
      email: invite.email,
      token: invite.token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get setup summary metrics for Election Setup dashboard
// @route   GET /api/elections/:electionId/setup-summary
// @access  Private/SuperAdmin
const getSetupSummary = async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);
    const election = await Election.findOne({ electionId });
    if (!election) {
      res.status(404);
      throw new Error('Election not found');
    }

    const rosterCount = await VoterRoster.countDocuments({ electionId });
    const verifierInvites = await VerifierInvite.find({ electionId }).select('name email status createdAt');
    const candidates = await getCandidatesWithMetadata(electionId);

    res.json({
      electionId,
      title: election.title,
      description: election.description,
      status: election.status,
      candidateCount: candidates.length,
      candidates,
      rosterCount,
      verifierInvites,
      acceptedVerifiersCount: election.verifiers.length,
      inviteToken: election.inviteToken,
      registrationPeriod: election.registrationPeriod,
      votingPeriod: election.votingPeriod,
      superAdmin: election.superAdmin,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get election details by electionId
// @route   GET /api/elections/:electionId
// @access  Public / Private
const getElectionById = async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);
    const election = await Election.findOne({ electionId });

    if (!election) {
      res.status(404);
      throw new Error('Election not found');
    }

    let onChainStatus = { active: false, started: false };
    try {
      onChainStatus = await getElectionStatusOnChain(electionId);
    } catch (err) {
      console.warn(`[getElectionById] Failed to query chain status for election ${electionId}:`, err.message);
    }

    res.json({
      ...election.toObject(),
      onChainStatus,
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Upload Excel voter roster (import only — no emails, no status flip)
// @route   POST /api/elections/:electionId/roster/upload
// @access  Private/SuperAdmin
const uploadVoterRoster = async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload an Excel roster file (.xlsx or .xls)');
    }

    const election = await Election.findOne({ electionId });
    if (!election) {
      res.status(404);
      throw new Error('Election not found');
    }

    // Parse Excel file server-side using xlsx package
    const workbook = xlsx.readFile(req.file.path);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rows || rows.length === 0) {
      res.status(400);
      throw new Error('Uploaded Excel file contains no data rows');
    }

    /**
     * Accepted column header variants — first non-empty match wins.
     * NOTE: header matching is case-sensitive (xlsx preserves header text exactly).
     * Only the variants listed here are recognised.
     *
     * Required columns (all five must be present and non-empty for each row):
     *   email            → email | Email | Email Address | EMAIL
     *   Full Name        → fullName | name | Full Name | Name
     *   Employee ID      → employeeId | id | Employee ID | Student ID
     *   Citizenship No.  → citizenshipNumber | Citizenship Number | Citizenship No | CitizenshipNo
     *   Date of Birth    → dateOfBirth | Date of Birth | DOB | DateOfBirth
     */
    const pick = (row, ...keys) => {
      for (const k of keys) {
        const v = row[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
      }
      return '';
    };

    // ISO-8601 date validator — accepts YYYY-MM-DD
    const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

    const rowErrors = [];
    const validRows = [];
    const seenEmails = new Map();

    rows.forEach((row, index) => {
      const rowNum = index + 2; // +1 for header row, +1 for 1-based count

      const email           = pick(row, 'email', 'Email', 'Email Address', 'EMAIL');
      const fullName        = pick(row, 'fullName', 'name', 'Full Name', 'Name');
      const employeeId      = pick(row, 'employeeId', 'id', 'Employee ID', 'Student ID');
      const citizenshipNum  = pick(row, 'citizenshipNumber', 'Citizenship Number', 'Citizenship No', 'CitizenshipNo');
      const dateOfBirth     = pick(row, 'dateOfBirth', 'Date of Birth', 'DOB', 'DateOfBirth');

      const missing = [];

      if (!email) {
        missing.push('email');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrors.push({ row: rowNum, field: 'email', message: `Row ${rowNum}: '${email}' is not a valid email address.` });
        return;
      }

      if (!fullName)       missing.push('Full Name');
      if (!employeeId)     missing.push('Employee ID');
      if (!citizenshipNum) missing.push('Citizenship Number');
      if (!dateOfBirth)    missing.push('Date of Birth');

      if (missing.length > 0) {
        rowErrors.push({
          row: rowNum,
          field: missing.join(', '),
          message: `Row ${rowNum}: Missing required field(s): ${missing.join(', ')}.`,
        });
        return;
      }

      if (!isValidDate(dateOfBirth)) {
        rowErrors.push({
          row: rowNum,
          field: 'Date of Birth',
          message: `Row ${rowNum}: 'Date of Birth' must be in YYYY-MM-DD format (got '${dateOfBirth}').`,
        });
        return;
      }

      const cleanEmail = normalizeEmail(email);
      if (seenEmails.has(cleanEmail)) {
        rowErrors.push({
          row: rowNum,
          field: 'email',
          message: `Row ${rowNum}: '${cleanEmail}' is duplicated in this upload (first seen on row ${seenEmails.get(cleanEmail)}).`,
        });
        return;
      }
      seenEmails.set(cleanEmail, rowNum);

      validRows.push({
        row: rowNum,
        email: cleanEmail,
        fullName,
        employeeId,
        citizenshipNumber: citizenshipNum,
        dateOfBirth,
      });
    });

    if (validRows.length > 0) {
      const rosterEmails = validRows.map((row) => row.email);

      const existingUsers = await User.find({ email: { $in: rosterEmails } });
      const userByEmail = new Map(existingUsers.map((user) => [user.email.toLowerCase(), user]));
      validRows.forEach((row) => {
        const user = userByEmail.get(row.email);
        const conflictRole = getRoleConflict(user, 'voter');
        if (conflictRole) {
          rowErrors.push({
            row: row.row,
            field: 'email',
            message: `Row ${row.row}: '${row.email}' is already assigned to a different role and cannot be imported as a voter.`,
          });
        }
      });

      const verifierInvites = await VerifierInvite.find({
        email: { $in: rosterEmails },
        status: { $in: ['pending', 'accepted'] },
      });
      const inviteByEmail = new Map(verifierInvites.map((invite) => [invite.email.toLowerCase(), invite]));
      validRows.forEach((row) => {
        if (inviteByEmail.has(row.email)) {
          rowErrors.push({
            row: row.row,
            field: 'email',
            message: `Row ${row.row}: '${row.email}' is already invited as a Registration Verifier and cannot be imported as a voter.`,
          });
        }
      });
    }

    // Reject the entire upload if any rows had errors — prevents partial imports
    if (rowErrors.length > 0) {
      return res.status(422).json({
        message: `Upload rejected: ${rowErrors.length} row(s) have validation errors. Fix the issues and re-upload.`,
        rowErrors,
        totalRows: rows.length,
        errorCount: rowErrors.length,
      });
    }

    // All rows valid — upsert into the database
    let importedCount = 0;
    for (const r of validRows) {
      await VoterRoster.findOneAndUpdate(
        { electionId, email: r.email },
        {
          electionId,
          email: r.email,
          fullName: r.fullName,
          employeeId: r.employeeId,
          citizenshipNumber: r.citizenshipNumber,
          dateOfBirth: r.dateOfBirth,
          // NOTE: invitationSent is NOT reset — preserves sent-state for re-uploads
        },
        { upsert: true, new: true }
      );
      importedCount++;
    }

    // NOTE: Status is NOT flipped here. Call POST /:electionId/open-registration
    // when ready to open registration and dispatch invitation emails.
    res.json({
      message: `Roster imported successfully. ${importedCount} voter(s) added or updated.`,
      count: importedCount,
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Open registration: flip status draft→registration_open, send invite emails to unsent roster rows
// @route   POST /api/elections/:electionId/open-registration
// @access  Private/SuperAdmin
const openRegistration = async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);

    const election = await Election.findOne({ electionId });
    if (!election) {
      res.status(404);
      throw new Error('Election not found');
    }

    if (election.status !== 'draft') {
      res.status(400);
      throw new Error(
        `Registration can only be opened from 'draft' status. Current status: '${election.status}'.`
      );
    }

    // Only send to rows where invitation has NOT yet been sent.
    // This means re-running open-registration after a late roster upload
    // will send to the new additions only, not duplicate to existing voters.
    const unsentRosters = await VoterRoster.find({ electionId, invitationSent: false });

    if (unsentRosters.length === 0) {
      // Still flip the status even if no voters to email (edge case: empty roster)
      election.status = 'registration_open';
      await election.save();
      return res.json({
        message: 'Registration is now open. No roster entries found to email.',
        emailsSent: 0,
      });
    }

    // Flip status first so the register link is live before emails arrive
    election.status = 'registration_open';
    await election.save();

    let emailsSent = 0;
    for (const roster of unsentRosters) {
      try {
        await sendRosterInvitationEmail({
          email: roster.email,
          fullName: roster.fullName,
          electionTitle: election.title,
          inviteToken: election.inviteToken,
          registrationDeadline: election.registrationPeriod?.endDate,
        });
        roster.invitationSent = true;
        await roster.save();
        emailsSent++;
      } catch (mailErr) {
        console.error(`[openRegistration] Failed to send invite to ${roster.email}:`, mailErr.message);
      }
    }

    res.json({
      message: `Registration is now open. Sent ${emailsSent} of ${unsentRosters.length} invitation email(s).`,
      emailsSent,
      total: unsentRosters.length,
      inviteToken: election.inviteToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save off-chain candidate metadata (party, photo) after candidate is added on-chain via MetaMask
// @route   POST /api/elections/:electionId/candidates
// @access  Private/SuperAdmin
const addCandidate = async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);
    const { name, party, candidateId: rawCandidateId } = req.body;

    if (!name) {
      res.status(400);
      throw new Error('Candidate name is required');
    }

    // Read candidates from chain to verify on-chain registration and obtain/verify candidate ID
    const chainCandidates = await getCandidatesFromChain(electionId);
    
    let targetCandidateId = rawCandidateId ? Number(rawCandidateId) : null;
    let matchedCandidate = null;

    if (targetCandidateId !== null && !isNaN(targetCandidateId)) {
      matchedCandidate = chainCandidates.find((c) => c.id === targetCandidateId);
    }
    
    if (!matchedCandidate) {
      matchedCandidate = chainCandidates.find((c) => c.name === name) || chainCandidates[chainCandidates.length - 1];
    }

    let photoPath = null;
    if (req.file) {
      photoPath = `/uploads/candidates/${req.file.filename}`;
    }

    if (matchedCandidate) {
      await Candidate.findOneAndUpdate(
        { electionId, candidateId: matchedCandidate.id },
        {
          electionId,
          candidateId: matchedCandidate.id,
          party: party ? party.trim() : '',
          photoPath,
        },
        { upsert: true, new: true }
      );
    }

    res.json({ message: 'Candidate metadata saved successfully', candidate: matchedCandidate });
  } catch (error) {
    next(error);
  }
};

// @desc    Get candidates for an election
// @route   GET /api/elections/:electionId/candidates
// @access  Private / Public
const getCandidates = async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);
    const candidates = await getCandidatesWithMetadata(electionId);
    res.json(candidates);
  } catch (error) {
    next(error);
  }
};

// @desc    Invite Registration Verifier (Name + Email, creates pending VerifierInvite)
// @route   POST /api/elections/:electionId/verifiers
// @access  Private/SuperAdmin
const assignVerifier = async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);
    const { name, email } = req.body;
    const cleanEmail = normalizeEmail(email);

    if (!name || !cleanEmail) {
      res.status(400);
      throw new Error('Verifier name and email are required');
    }

    const election = await Election.findOne({ electionId });
    if (!election) {
      res.status(404);
      throw new Error('Election not found');
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    assertUserCanUseRole(existingUser, 'verifier', res);

    const voterRosterEntry = await VoterRoster.findOne({ email: cleanEmail });
    if (voterRosterEntry) {
      res.status(409);
      throw new Error('This email is already reserved as a voter and cannot be used as a Registration Verifier.');
    }

    // Create or update pending invitation with fresh token
    const inviteToken = crypto.randomBytes(16).toString('hex');
    const inviteDoc = await VerifierInvite.findOneAndUpdate(
      { electionId, email: cleanEmail },
      {
        electionId,
        name: name.trim(),
        email: cleanEmail,
        token: inviteToken,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      { upsert: true, new: true }
    );

    await sendVerifierInvitationEmail({
      email: inviteDoc.email,
      name: inviteDoc.name,
      electionTitle: election.title,
      inviteToken: inviteDoc.token,
    });

    res.json({
      message: `Invitation email successfully dispatched to ${cleanEmail}`,
      inviteToken: inviteDoc.token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove Registration Verifier (Updates DB after MetaMask removal on frontend)
// @route   DELETE /api/elections/:electionId/verifiers/:verifierAddress
// @access  Private/SuperAdmin
const removeVerifier = async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);
    const verifierAddress = req.params.verifierAddress;

    const election = await Election.findOne({ electionId });
    if (election) {
      const vLower = verifierAddress.toLowerCase();
      election.verifiers = election.verifiers.filter((v) => v !== vLower);
      await election.save();

      await User.updateOne(
        { walletAddress: vLower },
        { $pull: { adminRoles: { electionId, role: 'verifier' } } }
      );
    }

    res.json({ message: 'Registration verifier removed successfully', verifiers: election?.verifiers || [] });
  } catch (error) {
    next(error);
  }
};

// @desc    On-demand sync: Reconciles MongoDB election state with EVM smart contract state
// @route   POST /api/elections/:electionId/sync-blockchain
// @access  Private/Verifier/SuperAdmin
const syncElectionFromChain = async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);
    const election = await Election.findOne({ electionId });
    if (!election) {
      res.status(404);
      throw new Error('Election not found');
    }

    // 1. Sync Election Status from Blockchain
    let updatedStatus = election.status;
    try {
      const { active, started } = await getElectionStatusOnChain(electionId);
      if (started && active && election.status !== 'voting_active') {
        election.status = 'voting_active';
        await election.save();
        updatedStatus = 'voting_active';
      } else if (started && !active && election.status !== 'ended') {
        election.status = 'ended';
        await election.save();
        updatedStatus = 'ended';
      }
    } catch (statusErr) {
      console.warn(`[syncElectionFromChain] Status query warning for election ${electionId}:`, statusErr.message);
    }

    // 2. Sync Candidates from Blockchain
    let candidateCount = 0;
    try {
      const chainCandidates = await getCandidatesFromChain(electionId);
      const chainIds = chainCandidates.map((c) => c.id);
      await Candidate.syncWithChain(electionId, chainIds);
      candidateCount = chainCandidates.length;
    } catch (candErr) {
      console.warn(`[syncElectionFromChain] Candidate query warning for election ${electionId}:`, candErr.message);
    }

    res.json({
      message: 'Election successfully resynchronized with blockchain',
      electionId,
      status: updatedStatus,
      candidateCount,
      syncedAt: new Date(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start election (Updates DB status after MetaMask transaction confirms on-chain)
// @route   POST /api/elections/:electionId/start
// @access  Private/SuperAdmin
const startElection = async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);

    const election = await Election.findOne({ electionId });
    if (election) {
      election.status = 'voting_active';
      await election.save();
    }

    res.json({ message: 'Election started successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    End election (Updates DB status after MetaMask transaction confirms on-chain)
// @route   POST /api/elections/:electionId/end
// @access  Private/SuperAdmin
const endElection = async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);

    const election = await Election.findOne({ electionId });
    if (election) {
      election.status = 'ended';
      await election.save();
    }

    res.json({ message: 'Election ended successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get election results and winner
// @route   GET /api/elections/:electionId/results
// @access  Public / Private
const getElectionResults = async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);
    const candidates = await getCandidatesWithMetadata(electionId);

    let winner = null;
    try {
      winner = await getWinnerFromChain(electionId);
    } catch (wErr) {
      console.warn(`[getElectionResults] getWinner failed for election ${electionId}:`, wErr.message);
    }

    res.json({ electionId, winner, candidates });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createElection,
  getElections,
  getElectionById,
  getElectionByToken,
  getVerifierInviteByToken,
  getSetupSummary,
  uploadVoterRoster,
  openRegistration,
  addCandidate,
  getCandidates,
  assignVerifier,
  removeVerifier,
  startElection,
  endElection,
  getElectionResults,
  syncElectionFromChain,
};
