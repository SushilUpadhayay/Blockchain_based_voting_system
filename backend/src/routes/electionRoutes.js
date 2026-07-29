const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/electionController');
const { protect } = require('../middleware/auth');
const { isSuperAdmin, isRegistrationVerifier } = require('../middleware/electionRole');
const { uploadCandidatePhoto, uploadRosterExcel } = require('../middleware/upload');

router.post('/', protect, createElection);
router.get('/', getElections);
router.get('/by-token/:inviteToken', getElectionByToken);
router.get('/verifier-invite/:token', getVerifierInviteByToken);
router.get('/:electionId/setup-summary', protect, isSuperAdmin, getSetupSummary);
router.get('/:electionId', getElectionById);


router.post('/:electionId/roster/upload', protect, isSuperAdmin, uploadRosterExcel, uploadVoterRoster);
router.post('/:electionId/open-registration', protect, isSuperAdmin, openRegistration);
router.post('/:electionId/candidates', protect, isSuperAdmin, uploadCandidatePhoto, addCandidate);
router.get('/:electionId/candidates', getCandidates);

router.post('/:electionId/verifiers', protect, isSuperAdmin, assignVerifier);
router.delete('/:electionId/verifiers/:verifierAddress', protect, isSuperAdmin, removeVerifier);

router.post('/:electionId/start', protect, isSuperAdmin, startElection);
router.post('/:electionId/end', protect, isSuperAdmin, endElection);
router.get('/:electionId/results', getElectionResults);

// On-demand blockchain sync (Super Admin or Verifier may trigger)
router.post('/:electionId/sync-blockchain', protect, isRegistrationVerifier, syncElectionFromChain);

module.exports = router;
