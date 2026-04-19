const express = require('express');
const router = express.Router();
const { getPendingUsers, approveUser, rejectUser } = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

router.use(protect, admin); // Apply auth & admin middleware to all routes in this file

router.get('/pending-users', getPendingUsers);
router.post('/approve/:id', approveUser);
router.post('/reject/:id', rejectUser);

module.exports = router;
