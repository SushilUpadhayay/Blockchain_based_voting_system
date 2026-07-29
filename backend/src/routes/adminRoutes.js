const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { isRegistrationVerifier } = require('../middleware/electionRole');
const {
  getPendingUsers,
  approveUser,
  rejectUser,
  blockUser,
  getRegisteredUsers,
  syncVoter,
} = require('../controllers/adminController');

router.get('/elections/:electionId/pending-users', protect, isRegistrationVerifier, getPendingUsers);
router.post('/elections/:electionId/approve/:id', protect, isRegistrationVerifier, approveUser);
router.post('/elections/:electionId/reject/:id', protect, isRegistrationVerifier, rejectUser);
router.post('/elections/:electionId/block/:id', protect, isRegistrationVerifier, blockUser);

router.get('/elections/:electionId/registered-users', protect, isRegistrationVerifier, getRegisteredUsers);
router.post('/elections/:electionId/sync-voter/:id', protect, isRegistrationVerifier, syncVoter);

module.exports = router;
