/**
 * templateRoutes.js
 */
const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const {
  createTemplate,
  getTemplate,
  getPublicTemplates,
  getMyTemplates,
  updateTemplate,
  publishTemplate,
  deleteTemplate,
  useTemplate
} = require('../controllers/templateController')

router.post('/', protect, requireRole('teacher'), createTemplate)
router.get('/', protect, requireRole('teacher'), getPublicTemplates)
router.get('/:id', protect, requireRole('teacher'), getTemplate)
router.get('/mine', protect, requireRole('teacher'), getMyTemplates)
router.put('/:id', protect, requireRole('teacher'), updateTemplate)
router.patch('/:id/publish', protect, requireRole('teacher'), publishTemplate)
router.delete('/:id', protect, requireRole('teacher'), deleteTemplate)
router.post('/:id/use', protect, requireRole('teacher'), useTemplate)

module.exports = router