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
const { createClassRoom, getMyClassRooms, getClassRoom, getSectionClassRooms, getClassRoomLessons } = require('../controllers/classroomController')

router.post('/', protect, requireRole('teacher'), createClassRoom)
router.get('/mine', protect, requireRole('teacher'), getMyClassRooms)
router.get('/my-section', protect, requireRole('student'), getSectionClassRooms)
router.get('/:id/lessons', protect, requireRole('student'), getClassRoomLessons)
router.get('/:id', protect, requireRole('teacher'), getClassRoom)


module.exports = router