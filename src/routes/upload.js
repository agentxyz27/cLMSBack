/**
 * Upload Routes
 *
 * POST /api/upload → upload a file to Supabase Storage
 *
 * Uses multer middleware to parse multipart/form-data.
 * File is stored in memory before uploading to Supabase.
 * Only teachers can upload files.
 */

const express = require('express')
const router = express.Router()
const multer = require('multer')
const protect = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { uploadFile } = require('../controllers/uploadController')

// Store file in memory — we pass the buffer directly to Supabase
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel' // xls
    ]

    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('File type not allowed'))
    }
  }
})

router.post('/', protect, requireRole('teacher'), upload.single('file'), uploadFile)

module.exports = router