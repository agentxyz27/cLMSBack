/**
 * Subject Routes
 * 
 * All routes here are protected — requires a valid JWT token.
 * The `protect` middleware verifies the token before reaching the controller.
 * 
 * POST /api/subjects     → create a new subject (teacher only)
 * GET  /api/subjects     → get all subjects owned by the logged-in teacher
 */
const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const { createSubject, getSubjects, updateSubject, deleteSubject } = require('../controllers/subjectController')

// protect is applied per route so we can later add role-based access (e.g. admin, student)
router.post('/', protect, createSubject)
router.get('/', protect, getSubjects)
router.put('/:id', protect, updateSubject)
router.delete('/:id', protect, deleteSubject)

module.exports = router

