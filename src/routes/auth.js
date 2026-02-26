/**
 * Auth Routes
 * 
 * Public routes — no token required.
 * Handles teacher registration and login.
 * 
 * POST /api/auth/register  → register a new teacher account
 * POST /api/auth/login     → login and receive a JWT token
 */
const express = require('express')
const router = express.Router()
const { registerTeacher, loginTeacher } = require('../controllers/authController')

// No protect middleware here — these routes must be publicly accessible
router.post('/register', registerTeacher)
router.post('/login', loginTeacher)

module.exports = router