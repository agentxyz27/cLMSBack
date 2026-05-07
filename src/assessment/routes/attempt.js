const express = require('express')
const router  = express.Router()

const protect      = require('../../middleware/auth')
const requireRole  = require('../../middleware/requireRole')
const {
  startQuestion,
  submitAnswer,
  useHint,
  finishSession,
  getSession
} = require('../controllers/attemptController')

// All attempt routes require an authenticated student
router.use(protect, requireRole('student'))

// ── Attempt Pipeline ───────────────────────────────────────────────────────
router.post('/start/:questionId',          startQuestion)  // POST  /api/attempts/start/:questionId
router.post('/submit/:sessionToken',       submitAnswer)   // POST  /api/attempts/submit/:sessionToken
router.post('/hint/:sessionToken',         useHint)        // POST  /api/attempts/hint/:sessionToken
router.post('/finish/:sessionToken',       finishSession)  // POST  /api/attempts/finish/:sessionToken
router.get('/session/:sessionToken',       getSession)     // GET   /api/attempts/session/:sessionToken

module.exports = router