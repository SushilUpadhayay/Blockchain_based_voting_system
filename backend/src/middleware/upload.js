const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure uploads/candidates directory exists
const candidateUploadDir = path.join(uploadDir, 'candidates');
if (!fs.existsSync(candidateUploadDir)) {
  fs.mkdirSync(candidateUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    // Make filename unique: fieldname-timestamp.ext
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png|pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb('Error: Images and PDFs Only!');
  }
}

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// For dual citizenship image upload (front + back)
const uploadCitizenship = upload.fields([
  { name: 'documentFront', maxCount: 1 },
  { name: 'documentBack',  maxCount: 1 },
]);

// For candidate photo upload — stored in uploads/candidates/ subfolder
const candidatePhotoStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, candidateUploadDir);
  },
  filename(req, file, cb) {
    cb(null, `candidate-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const uploadCandidatePhoto = multer({
  storage: candidatePhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(req, file, cb) {
    const allowed = /jpg|jpeg|png/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Candidate photo must be a JPG or PNG image.'));
  },
}).single('photo');

module.exports = { upload, uploadCitizenship, uploadCandidatePhoto };
