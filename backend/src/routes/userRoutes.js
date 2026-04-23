const express = require('express');
const router = express.Router();
const { uploadDocument, connectWallet, getProfile } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.post('/upload-document', protect, upload.single('document'), uploadDocument);
router.post('/connect-wallet', protect, connectWallet);
router.get('/profile', protect, getProfile);

module.exports = router;
