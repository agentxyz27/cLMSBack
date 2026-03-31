/**
 * uploadController.js
 *
 * Handles file uploads to Supabase Storage.
 * Files are stored in the 'lesson-files' bucket.
 * Returns a public URL that gets saved in a LessonBlock's data field.
 *
 * Supported file types:
 *   Images → jpg, jpeg, png, gif, webp
 *   Documents → pdf
 *   Spreadsheets → xlsx, xls
 *
 * uploadFile → uploads a file to Supabase Storage, returns public URL
 */

const supabase = require('../supabase')

/**
 * POST /api/upload
 * Uploads a file to Supabase Storage.
 * File comes in as multipart/form-data via multer middleware.
 * Returns the public URL of the uploaded file.
 *
 * Filename sanitization:
 *   All special characters removed — only letters, numbers, dots, hyphens allowed.
 *   Timestamp prefix ensures uniqueness and prevents overwrites.
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' })
    }

    const { originalname, mimetype, buffer } = req.file

    // Create a unique filename to prevent overwrites
    const timestamp = Date.now()
    const safeName = originalname
      .replace(/[^a-zA-Z0-9.\-_]/g, '-') // remove special characters
      .replace(/-+/g, '-')                // collapse multiple dashes into one
      .toLowerCase()
    const filename = `${timestamp}-${safeName}`

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('lesson-files')
      .upload(filename, buffer, {
        contentType: mimetype,
        upsert: false // never overwrite — timestamp ensures uniqueness
      })

    if (error) throw new Error(error.message)

    // Get the public URL
    const { data } = supabase.storage
      .from('lesson-files')
      .getPublicUrl(filename)

    res.status(201).json({
      message: 'File uploaded',
      url: data.publicUrl,
      name: originalname,         // original name for display
      fileType: originalname.split('.').pop().toLowerCase()
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { uploadFile }