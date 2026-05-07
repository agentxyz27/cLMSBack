const express = require('express')
const router  = express.Router()

const protect     = require('../../middleware/auth')
const requireRole = require('../../middleware/requireRole')
const {
  findTemplate,
  getTemplatesByTopic,
  assignRemediation,
  getAssignments,
  updateAssignmentStatus,
  getClassroomAssignments
} = require('../controllers/templateEngineController')

// ── Template Engine Routes ─────────────────────────────────────────────────

// Teacher routes
router.get('/find',                                     protect, requireRole('teacher'), findTemplate)
router.get('/topic/:topicId',                           protect, requireRole('teacher'), getTemplatesByTopic)
router.post('/assign',                                  protect, requireRole('teacher'), assignRemediation)
router.get('/assignments/student/:studentId',           protect, requireRole('teacher'), getAssignments)
router.get('/assignments/classroom/:classRoomId',       protect, requireRole('teacher'), getClassroomAssignments)

// Teacher or student — status update
router.patch('/assignments/:assignmentId/status',       protect, requireRole(['teacher', 'student']), updateAssignmentStatus)

module.exports = router