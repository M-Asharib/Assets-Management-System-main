const router   = require('express').Router();
const multer   = require('multer');
const cloudinary = require('cloudinary').v2;
const { requireAuth } = require('../middleware/auth');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(jpeg|png|gif|webp)$|^video\/(mp4|quicktime|webm)$/;
    if (!allowed.test(file.mimetype)) {
      return cb(new Error('Only image (jpeg/png/gif/webp) or video (mp4/mov/webm) files are allowed.'));
    }
    cb(null, true);
  },
});

function isConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function uploadBuffer(buffer, resourceType) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'maintainiq/evidence', resource_type: resourceType },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// POST /api/upload/public — evidence attached to a public issue report (no login required)
router.post('/public', upload.single('file'), async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'Media storage is not configured on this server yet.' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  try {
    const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    const result = await uploadBuffer(req.file.buffer, resourceType);
    res.json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload — evidence attached from the internal (logged-in) maintenance/issue UI
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'Media storage is not configured on this server yet.' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  try {
    const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    const result = await uploadBuffer(req.file.buffer, resourceType);
    res.json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
