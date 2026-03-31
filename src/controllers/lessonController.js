/**
 * lessonController.js
 *
 * Handles lesson creation, retrieval, update, and deletion under a subject.
 * A lesson must belong to a subject — subjectId is required.
 *
 * content field removed — lessons now store content as ordered LessonBlocks.
 * Blocks are managed separately via blockController.js.
 *
 * createLesson → creates a lesson under a specific subject
 * getLessons   → returns all lessons under a specific subject, includes blocks
 * updateLesson → updates lesson title only (content is managed via blocks)
 * deleteLesson → deletes a lesson and all its blocks (cascade)
 */

const prisma = require('../prisma')

/**
 * POST /api/lessons
 * Creates a new lesson linked to a subject.
 * No content on creation — teacher adds blocks after creating the lesson.
 */
const createLesson = async (req, res) => {
  try {
    const { title, subjectId } = req.body // content removed

    const lesson = await prisma.lesson.create({
      data: { title, subjectId }
    })

    res.status(201).json({ message: 'Lesson created', lesson })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * GET /api/lessons/:subjectId
 * Returns all lessons under a specific subject.
 * Includes blocks ordered by their position so frontend can render them in order.
 */
const getLessons = async (req, res) => {
  try {
    const { subjectId } = req.params

    const lessons = await prisma.lesson.findMany({
      where: { subjectId: parseInt(subjectId) },
      include: {
        blocks: {
          orderBy: { order: 'asc' } // always return blocks in correct order
        }
      }
    })

    res.json(lessons)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * PUT /api/lessons/:id
 * Updates lesson title only.
 * Block content is managed separately via blockController.js.
 */
const updateLesson = async (req, res) => {
  try {
    const { title } = req.body // content removed
    const id = parseInt(req.params.id)

    const lesson = await prisma.lesson.update({
      where: { id },
      data: { title }
    })

    res.json({ message: 'Lesson updated', lesson })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * DELETE /api/lessons/:id
 * Deletes a lesson by ID.
 * LessonBlocks and Progress records are cascade deleted automatically.
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