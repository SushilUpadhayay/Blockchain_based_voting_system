const express = require('express');
const router = express.Router();
const { getPendingUsers, approveUser, rejectUser, blockUser, startElection, endElection, addCandidate, getRegisteredUsers, syncVoter } = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const {
  validateMongoIdParam,
  validateRejectUser,
  validateAddCandidate
} = require('../middleware/validator');

router.use(protect, admin);

router.get('/pending-users', getPendingUsers);
router.post('/approve/:id', validateMongoIdParam, approveUser);
router.post('/reject/:id', validateRejectUser, rejectUser);
router.post('/block/:id', validateMongoIdParam, blockUser);
router.post('/start-election', startElection);
router.post('/end-election', endElection);
router.post('/add-candidate', validateAddCandidate, addCandidate);
router.get('/registered-users', getRegisteredUsers);
router.post('/sync-voter/:id', validateMongoIdParam, syncVoter);

module.exports = router;
