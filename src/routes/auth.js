/**
 * Auth Routes
 *
 * Public routes — no token required unless noted.
 *
 * POST /api/auth/register          → register a new teacher account
 * POST /api/auth/login             → login as teacher, receive JWT
 * POST /api/auth/student/register  → register a new student account
 * POST /api/auth/student/login     → login as student, receive JWT
 * GET  /api/auth/me                → get current user profile (protected)
 */

const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const {
  registerTeacher,
  loginTeacher,
  registerStudent,
  loginStudent,
  getMe
} = require('../controllers/authController')

// Teacher auth
router.post('/register/teacher', registerTeacher)
router.post('/login/teacher', loginTeacher)

// Student auth
router.post('/register/student', registerStudent)
router.post('/login/student', loginStudent)

// Profile — requires valid token, works for all roles
router.get('/me', protect, getMe)

module.exports = router