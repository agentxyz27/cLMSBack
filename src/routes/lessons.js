/**
 * Lesson Routes
 * 
 * POST /api/lessons              → create a lesson under a subject
 * GET  /api/lessons/:subjectId   → get all lessons under a subject
 */
const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const { createLesson, getLessons } = require('../controllers/lessonController')

router.post('/', protect, createLesson)
router.get('/:subjectId', protect, getLessons)

module.exports = router