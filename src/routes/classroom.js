/**
 * classroomRoutes.js
 *
 * All routes require authentication.
 * Only teachers can create and access classrooms.
 */
const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { createClassRoom, getMyClassRooms, getClassRoom, getSectionClassRooms, getClassRoomLessons, getClassRoomForStudent } = require('../controllers/classroomController')

// For teachers to create a classroom by selecting a subject and section they teach
router.post('/', protect, requireRole('teacher'), createClassRoom)

// For teachers to get all their classrooms with subject and section info
router.get('/mine', protect, requireRole('teacher'), getMyClassRooms)

// For teachers to get a single classroom by ID, including its lessons
router.get('/my-section', protect, requireRole('student'), getSectionClassRooms)

// For students to access a classroom by ID, but only if it belongs to their section
router.get('/:id/student', protect, requireRole('student'), getClassRoomForStudent)

// For students to get all lessons for a classroom, but only if it belongs to their section
router.get('/:id/lessons', protect, requireRole('student'), getClassRoomLessons)

// For teachers to get a single classroom by ID, including its lessons
router.get('/:id', protect, requireRole('teacher'), getClassRoom)


module.exports = router