/**
 * Auth Routes
 *
 * Public routes — no token required unless noted.
 *
 * POST /api/auth/register          → register a new teacher account
 * POST /api/auth/login             → login as teacher, receive JWT
 * POST /api/auth/student/register  → register a new student account
 * POST /api/auth/student/login     → login as student, receive JWT
 * POST /api/auth/admin/register    → register a new admin account
 * POST /api/auth/admin/login       → login as admin, receive JWT
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
  registerAdmin,
  loginAdmin,
  getMe
} = require('../controllers/authController')

// Teacher auth
router.post('/register', registerTeacher)
router.post('/login', loginTeacher)

// Student auth
router.post('/student/register', registerStudent)
router.post('/student/login', loginStudent)

// Admin auth
router.post('/admin/register', registerAdmin)
router.post('/admin/login', loginAdmin)

// Profile — requires valid token, works for all roles
router.get('/me', protect, getMe)

module.exports = router