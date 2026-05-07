const express = require('express')
const router  = express.Router()

const protect     = require('../../middleware/auth')
const requireRole = require('../../middleware/requireRole')
const {
  getPriorityList,
  getClassWeakSpots,
  getStudentDrillDown,
  getFocusSummary
} = require('../controllers/focusController')

// All focus routes require an authenticated teacher
router.use(protect, requireRole('teacher'))

// ── Focus Engine Routes ────────────────────────────────────────────────────

// GET /api/focus/:classRoomId/:lessonId/priority
// Students ranked by urgency — urgent → watch → good
router.get('/:classRoomId/:lessonId/priority', getPriorityList)

// GET /api/focus/:classRoomId/:lessonId/weak-spots
// Top 3 weakest topics for the class
router.get('/:classRoomId/:lessonId/weak-spots', getClassWeakSpots)

// GET /api/focus/:classRoomId/:lessonId/student/:studentId
// Per-question breakdown for a single student
router.get('/:classRoomId/:lessonId/student/:studentId', getStudentDrillDown)

// GET /api/focus/:classRoomId/:lessonId/summary
// Priority list + weak spots combined — single dashboard call
router.get('/:classRoomId/:lessonId/summary', getFocusSummary)

module.exports = router