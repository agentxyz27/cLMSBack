/**
 * Template Routes
 *
 * All routes require authentication via protect middleware.
 * Some routes are further restricted by role via requireRole.
 *
 * GET    /api/templates/public          → list all published templates (teacher, admin)
 * GET    /api/templates/mine            → list own templates (teacher, admin)
 * GET    /api/templates/:id             → get single template with contentJson (owner or public)
 * POST   /api/templates                 → create a new template (teacher, admin)
 * PUT    /api/templates/:id             → update title/contentJson (owner only)
 * POST   /api/templates/:id/publish     → publish template (owner only)
 * POST   /api/templates/:id/unpublish   → unpublish template (owner only)
 * POST   /api/templates/:id/duplicate   → duplicate into a lesson (teacher only)
 * DELETE /api/templates/:id             → delete template (owner only)
 *
 * Route ordering note:
 * /public and /mine must be defined BEFORE /:id
 * to prevent Express matching them as id params.
 */

const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const {
  createTemplate,
  getMyTemplates,
  getPublicTemplates,
  getTemplate,
  updateTemplate,
  publishTemplate,
  unpublishTemplate,
  duplicateTemplate,
  deleteTemplate
} = require('../controllers/templateController')

// Static routes first — before /:id
router.get('/public', protect, getPublicTemplates)
router.get('/mine',   protect, getMyTemplates)

// Param routes after
router.get   ('/:id',             protect, getTemplate)
router.post  ('/',                protect, requireRole('teacher') || requireRole('admin'), createTemplate)
router.put   ('/:id',             protect, updateTemplate)
router.post  ('/:id/publish',     protect, publishTemplate)
router.post  ('/:id/unpublish',   protect, unpublishTemplate)
router.post  ('/:id/duplicate',   protect, requireRole('teacher'), duplicateTemplate)
router.delete('/:id',             protect, deleteTemplate)

module.exports = router