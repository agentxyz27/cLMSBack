/**
 * Lesson Routes
 * 
 * POST /api/lessons              → create a lesson under a subject
 * GET  /api/lessons/:subjectId   → get all lessons under a subject
 */
const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const { createLesson, getLessons, updateLesson, deleteLesson } = require('../controllers/lessonController')

router.post('/', protect, createLesson)
router.get('/:subjectId', protect, getLessons)
router.put('/:id', protect, updateLesson)
router.delete('/:id', protect, deleteLesson)

module.exports = router
