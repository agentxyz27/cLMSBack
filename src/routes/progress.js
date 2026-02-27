/**
 * Progress Routes
 * 
 * All routes are protected — requires a valid student JWT token.
 * 
 * POST /api/progress  → mark a lesson as completed
 * GET  /api/progress  → get all progress for the logged-in student
 */
const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const { completeLesson, getProgress } = require('../controllers/progressController')

router.post('/', protect, completeLesson)
router.get('/', protect, getProgress)

module.exports = router