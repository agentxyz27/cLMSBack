const express = require('express')
const router  = express.Router()

const protect     = require('../../middleware/auth')
const requireRole = require('../../middleware/requireRole')
const {
  getAtRiskStudents,
  getWeakTopics,
  getRegressionAlerts,
  getClassSummary
} = require('../controllers/detectionController')

// All detection routes require an authenticated teacher
router.use(protect, requireRole('teacher'))

// ── Detection Engine Routes ────────────────────────────────────────────────

// GET /api/detection/:classRoomId/:lessonId/at-risk
// Students with isAtRisk = true — sorted weakest first
router.get('/:classRoomId/:lessonId/at-risk', getAtRiskStudents)

// GET /api/detection/:classRoomId/:lessonId/weak-topics
// Topics ranked by correctRate ascending — weakest topic first
router.get('/:classRoomId/:lessonId/weak-topics', getWeakTopics)

// GET /api/detection/:classRoomId/:lessonId/regression
// Students whose MPS dropped between last two snapshots
router.get('/:classRoomId/:lessonId/regression', getRegressionAlerts)

// GET /api/detection/:classRoomId/:lessonId/summary
// All three combined — single call for the dashboard detection panel
router.get('/:classRoomId/:lessonId/summary', getClassSummary)

module.exports = router