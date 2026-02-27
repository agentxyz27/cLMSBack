/**
 * Gamification Routes
 * 
 * POST /api/gamification/complete      → complete a lesson and earn XP
 * GET  /api/gamification/leaderboard   → get top 10 students by XP
 * GET  /api/gamification/badges        → get badges earned by logged-in student
 */
const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const { completeLesson, getLeaderboard, getMyBadges } = require('../controllers/gamificationController')

router.post('/complete', protect, completeLesson)
router.get('/leaderboard', protect, getLeaderboard)
router.get('/badges', protect, getMyBadges)

module.exports = router