/**
 * auth.ts — Auth Routes
 *
 * Public routes — no token required unless noted.
 *
 * POST /api/auth/register/teacher  → register a new teacher account
 * POST /api/auth/login/teacher     → login as teacher, receive JWT
 * POST /api/auth/register/student  → register a new student account
 * POST /api/auth/login/student     → login as student, receive JWT
 * GET  /api/auth/me                → get current user profile (protected)
 */
import { Router } from 'express'
import protect from '../../middleware/auth'
import {registerTeacher, loginTeacher, registerStudent, loginStudent, getMe} from '../controllers/authController'

const router = Router()

// Teacher auth
router.post('/register/teacher', registerTeacher)
router.post('/login/teacher', loginTeacher)

// Student auth
router.post('/register/student', registerStudent)
router.post('/login/student', loginStudent)

// Profile — requires valid token, works for all roles
router.get('/me', protect, getMe)

export default router