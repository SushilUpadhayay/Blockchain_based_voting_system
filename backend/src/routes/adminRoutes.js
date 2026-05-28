const express = require('express');
const router = express.Router();
const { getPendingUsers, approveUser, rejectUser, blockUser, startElection, endElection, addCandidate } = require('../controllers/adminController');
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

module.exports = router;
