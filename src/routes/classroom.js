const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')

const {
  createClassRoom,
  getMyClassRooms,
  getClassRoom,
  getSectionClassRooms,
  getClassRoomLessons,
  getClassRoomForStudent
} = require('../controllers/classroomController')

/**
 * =========================
 * TEACHER ROUTES
 * =========================
 */

// Create classroom
router.post(
  '/teacher/classrooms',
  protect,
  requireRole('teacher'),
  createClassRoom
)

// Get all teacher classrooms
router.get(
  '/teacher/classrooms',
  protect,
  requireRole('teacher'),
  getMyClassRooms
)

// Get single teacher classroom (full access)
router.get(
  '/teacher/classrooms/:id',
  protect,
  requireRole('teacher'),
  getClassRoom
)

/**
 * =========================
 * STUDENT ROUTES
 * =========================
 */

// Get all classrooms for student's section
router.get(
  '/student/classrooms',
  protect,
  requireRole('student'),
  getSectionClassRooms
)

// Get single classroom (student-safe view)
router.get(
  '/student/classrooms/:id',
  protect,
  requireRole('student'),
  getClassRoomForStudent
)

// Get lessons for a classroom (student-safe)
router.get(
  '/student/classrooms/:id/lessons',
  protect,
  requireRole('student'),
  getClassRoomLessons
)

module.exports = router