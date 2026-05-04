const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const { uploadBufferToS3 } = require('../src/lib/s3');

const router = express.Router();

// Ensure uploads directory exists (for document fallback)
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, safeName);
  },
});

const memoryStorage = multer.memoryStorage();

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;

const uploadDisk = multer({
  storage: diskStorage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only images (JPEG/PNG/WebP) and PDF files are allowed'));
  },
});

const uploadMemory = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
  },
});

// POST /api/upload/photo  â€” uploads an image to S3 and returns the public URL
router.post('/photo', auth, uploadMemory.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const key = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    const { url } = await uploadBufferToS3({
      key,
      buffer: req.file.buffer,
      contentType: req.file.mimetype,
    });

    res.json({
      name: req.body.name || req.file.originalname,
      url,
      key,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload/document
// Uploads a single file and returns its public URL
router.post('/document', auth, uploadDisk.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const url = `${baseUrl}/uploads/${req.file.filename}`;

    res.json({
      name: req.body.name || req.file.originalname,
      url,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
