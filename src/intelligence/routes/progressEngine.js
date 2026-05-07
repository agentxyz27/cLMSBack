const express = require('express')
const router  = express.Router()

const protect     = require('../../middleware/auth')
const requireRole = require('../../middleware/requireRole')
const {
  getStudentProgress,
  getClassProgress,
  getImprovementReport,
  getHeatmap
} = require('../controllers/progressEngineController')

// All progress engine routes require an authenticated teacher
router.use(protect, requireRole('teacher'))

// ── Progress Engine Routes ─────────────────────────────────────────────────

// GET /api/progress-engine/:classRoomId/student/:studentId
// MPS over time for a single student — feeds student line chart
router.get('/:classRoomId/student/:studentId', getStudentProgress)

// GET /api/progress-engine/:classRoomId/:lessonId/class
// Class avgMps over time — feeds class line chart
router.get('/:classRoomId/:lessonId/class', getClassProgress)

// GET /api/progress-engine/:classRoomId/:lessonId/improvement
// Before/after remediation comparison — did it work?
router.get('/:classRoomId/:lessonId/improvement', getImprovementReport)

// GET /api/progress-engine/:classRoomId/heatmap
// Student × lesson MPS grid — feeds heatmap chart
router.get('/:classRoomId/heatmap', getHeatmap)

module.exports = router