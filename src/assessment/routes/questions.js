const express = require('express')
const router  = express.Router()

const protect      = require('../../middleware/auth')
const requireRole  = require('../../middleware/requireRole')
const {
  createQuestion,
  getQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions
} = require('../controllers/questionController')

// ── Student-accessible routes (any authenticated user) ─────────────────────
router.get('/:id', protect, getQuestion)  // students need this to render questions

// ── Teacher-only routes ────────────────────────────────────────────────────
router.use(protect, requireRole('teacher'))

router.post('/',                              createQuestion)
router.get('/lesson/:lessonId',               getQuestions)
router.patch('/:id',                          updateQuestion)
router.delete('/:id',                         deleteQuestion)
router.patch('/lesson/:lessonId/reorder',     reorderQuestions)

module.exports = router