/**
 * Lesson Routes
 *
 * POST   /api/lessons              → create a lesson under a subject
 * GET    /api/lessons/:subjectId   → get all lessons under a subject (list, no canvas content)
 * GET    /api/lessons/lesson/:id   → get a single lesson with full canvas JSON
 * PUT    /api/lessons/:id          → update lesson title and/or contentJson
 * DELETE /api/lessons/:id          → delete a lesson and its progress records
 *
 * Note: /api/lessons/lesson/:id must be defined BEFORE /api/lessons/:id
 * to prevent Express matching 'lesson' as a subjectId param.
 */

const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const {
  createLesson,
  getLessons,
  getLesson,
  updateLesson,
  deleteLesson
} = require('../controllers/lessonController')

router.post('/', protect, createLesson)
router.get('/lesson/:id', protect, getLesson)   // specific route first
router.get('/:classRoomId', protect, getLessons)  // generic param route second
router.put('/:id', protect, updateLesson)
router.delete('/:id', protect, deleteLesson)

module.exports = router