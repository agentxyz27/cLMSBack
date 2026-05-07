const express = require('express')
const router  = express.Router()

const protect     = require('../../middleware/auth')
const requireRole = require('../../middleware/requireRole')
const {
  generateClassSnapshot,
  getClassSnapshots,
  getStudentSnapshots,
  getLatestClassSnapshot
} = require('../controllers/snapshotController')

// All snapshot routes require an authenticated teacher
router.use(protect, requireRole('teacher'))

// ── Snapshot Routes ────────────────────────────────────────────────────────

// POST /api/snapshots/:classRoomId/:lessonId
// Teacher clicks "Generate Report" — writes ClassLessonSnapshot
router.post('/:classRoomId/:lessonId', generateClassSnapshot)

// GET /api/snapshots/:classRoomId/:lessonId/class
// All ClassLessonSnapshots over time — feeds Progress Engine line chart
router.get('/:classRoomId/:lessonId/class', getClassSnapshots)

// GET /api/snapshots/:classRoomId/:lessonId/students
// All StudentLessonSnapshots — feeds Detection + Focus Engine
router.get('/:classRoomId/:lessonId/students', getStudentSnapshots)

// GET /api/snapshots/:classRoomId/:lessonId/latest
// Most recent ClassLessonSnapshot — feeds dashboard stat cards
router.get('/:classRoomId/:lessonId/latest', getLatestClassSnapshot)

module.exports = router