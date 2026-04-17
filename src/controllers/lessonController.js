/**
 * lessonController.js
 *
 * Handles lesson creation, retrieval, update, and deletion under a subject.
 * A lesson must belong to a subject — subjectId is required.
 *
 * Lessons now store content as a single canvas JSON blob (contentJson).
 * The block system has been removed entirely.
 *
 * Canvas JSON shape:
 *   {
 *     canvas: { width: 1280, height: 720, background: '#ffffff' },
 *     elements: [
 *       { id, type, x, y, width, height, props }
 *     ]
 *   }
 *
 * createLesson → creates a lesson under a subject, blank canvas by default
 * getLessons   → returns all lessons under a subject (no elements, list view only)
 * getLesson    → returns a single lesson with full contentJson (for editor/student view)
 * updateLesson → updates title and/or contentJson
 * deleteLesson → deletes a lesson and its progress records (cascade)
 */

const prisma = require('../prisma')

// Default blank canvas inserted on lesson creation if no contentJson is provided.
// 1280x720 matches the editor canvas dimensions.
const BLANK_CANVAS = {
  canvas: {
    width: 1280,
    height: 720,
    background: '#ffffff'
  },
  elements: []
}

/**
 * POST /api/lessons
 * Creates a new lesson linked to a subject.
 * contentJson defaults to a blank canvas if not provided.
 */
const createLesson = async (req, res) => {
  try {
    const { title, subjectId, contentJson } = req.body
    const lesson = await prisma.lesson.create({
      data: {
        title,
        subjectId,
        contentJson: contentJson ?? BLANK_CANVAS
      }
    })
    res.status(201).json({ message: 'Lesson created', lesson })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * GET /api/lessons/:subjectId
 * Returns all lessons under a specific subject.
 * Does not include contentJson — list view only, keeps payload small.
 * Use GET /api/lessons/lesson/:id to load full canvas content.
 */
const getLessons = async (req, res) => {
  try {
    const { subjectId } = req.params
    const lessons = await prisma.lesson.findMany({
      where: { subjectId: parseInt(subjectId) },
      select: {
        id: true,
        title: true,
        subjectId: true,
        createdAt: true,
        updatedAt: true
        // contentJson intentionally excluded — too heavy for list view
      }
    })
    res.json(lessons)
  } catch (err) {
    console.error('getLessons error:', err.message)
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * GET /api/lessons/lesson/:id
 * Returns a single lesson with full contentJson.
 * Used by the canvas editor and the student lesson viewer.
 */
const getLesson = async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const lesson = await prisma.lesson.findUnique({
      where: { id }
    })
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' })
    }
    res.json(lesson)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * PUT /api/lessons/:id
 * Updates lesson title and/or contentJson.
 * Either field is optional — send only what changed.
 * updatedAt is auto-managed by Prisma (@updatedAt on schema).
 */
const updateLesson = async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { title, contentJson } = req.body

    // Build update payload with only provided fields
    const data = {}
    if (title !== undefined) data.title = title
    if (contentJson !== undefined) data.contentJson = contentJson

    const lesson = await prisma.lesson.update({
      where: { id },
      data
    })
    res.json({ message: 'Lesson updated', lesson })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * DELETE /api/lessons/:id
 * Deletes a lesson by ID.
 * Progress records are cascade deleted automatically via schema.
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

module.exports = { createLesson, getLessons, getLesson, updateLesson, deleteLesson }