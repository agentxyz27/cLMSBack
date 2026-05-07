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

// All question routes require an authenticated teacher
router.use(protect, requireRole('teacher'))

// ── Question CRUD ──────────────────────────────────────────────────────────
router.post('/',                              createQuestion)   // POST   /api/questions
router.get('/lesson/:lessonId',               getQuestions)     // GET    /api/questions/lesson/:lessonId
router.get('/:id',                            getQuestion)      // GET    /api/questions/:id
router.patch('/:id',                          updateQuestion)   // PATCH  /api/questions/:id
router.delete('/:id',                         deleteQuestion)   // DELETE /api/questions/:id
router.patch('/lesson/:lessonId/reorder',     reorderQuestions) // PATCH  /api/questions/lesson/:lessonId/reorder

module.exports = router