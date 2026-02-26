/**
 * Lesson Controller
 * 
 * Handles lesson creation and retrieval under a subject.
 * A lesson must belong to a subject — subjectId is required.
 * 
 * createLesson → creates a lesson under a specific subject
 * getLessons   → returns all lessons under a specific subject
 */
const prisma = require('../prisma')

/**
 * POST /api/lessons
 * Creates a new lesson linked to a subject.
 */
const createLesson = async (req, res) => {
  try {
    const { title, content, subjectId } = req.body

    const lesson = await prisma.lesson.create({
      data: { title, content, subjectId }
    })

    res.status(201).json({ message: 'Lesson created', lesson })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * GET /api/lessons/:subjectId
 * Returns all lessons under a specific subject.
 */
const getLessons = async (req, res) => {
  try {
    const { subjectId } = req.params

    const lessons = await prisma.lesson.findMany({
      where: { subjectId: parseInt(subjectId) } // convert string to integer
    })

    res.json(lessons)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * PUT /api/lessons/:id
 * Updates a lesson title and content by ID.
 */
const updateLesson = async (req, res) => {
  try {
    const { title, content } = req.body
    const id = parseInt(req.params.id)

    const lesson = await prisma.lesson.update({
      where: { id },
      data: { title, content }
    })

    res.json({ message: 'Lesson updated', lesson })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * DELETE /api/lessons/:id
 * Deletes a lesson by ID.
 * Progress records linked to this lesson are cascade deleted automatically.
 */
const deleteLesson = async (req, res) => {
  try {
    const id = parseInt(req.params.id)

    await prisma.lesson.delete({
      where: { id }
    })

    res.json({ message: 'Lesson deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { createLesson, getLessons, updateLesson, deleteLesson }