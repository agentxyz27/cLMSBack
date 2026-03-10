/**
 * Enrollment Routes
 *
 * POST /api/enrollment              → teacher enrolls a student into a subject
 * GET  /api/enrollment/my-subjects  → student gets their enrolled subjects
 * GET  /api/enrollment/all-subjects → student browses all available subjects
 */
const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { enrollStudent, getMySubjects, getAllSubjects, getSubjectStudents } = require('../controllers/enrollmentController')

router.post('/', protect, requireRole('teacher'), enrollStudent)
router.get('/my-subjects', protect, requireRole('student'), getMySubjects)
router.get('/all-subjects', protect, requireRole('student'), getAllSubjects)
router.get('/subject/:id', protect, requireRole('teacher'), getSubjectStudents)

module.exports = router