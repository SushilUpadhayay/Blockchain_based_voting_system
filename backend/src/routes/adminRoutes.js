const express = require('express');
const router = express.Router();
const { getPendingUsers, approveUser, rejectUser, blockUser, startElection, endElection, addCandidate } = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

router.use(protect, admin);

router.get('/pending-users', getPendingUsers);
router.post('/approve/:id', approveUser);
router.post('/reject/:id', rejectUser);
router.post('/block/:id', blockUser);
router.post('/start-election', startElection);
router.post('/end-election', endElection);
router.post('/add-candidate', addCandidate);

module.exports = router;
