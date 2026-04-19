/**
 * lessonController.js
 *
 * Handles lesson creation, retrieval, update, and deletion under a classroom.
 * A lesson must belong to a classRoom — classRoomId is required.
 *
 * createLesson → creates a lesson under a classroom, blank canvas by default
 * getLessons   → returns all lessons under a classroom (no contentJson, list view only)
 * getLesson    → returns a single lesson with full contentJson (for editor/student view)
 * updateLesson → updates title and/or contentJson
 * deleteLesson → deletes a lesson and its progress records (cascade)
 */
const prisma = require('../prisma')

const BLANK_CANVAS = {
  canvas: { width: 1280, height: 720, background: '#ffffff' },
  elements: []
}

/**
 * POST /api/lessons
 * Creates a new lesson under a classroom.
 * Only the owning teacher can create lessons in their classroom.
 */
const createLesson = async (req, res) => {
  try {
    const { title, classRoomId, contentJson } = req.body
    const teacherId = req.user.id

    // Verify classroom exists and belongs to this teacher
    const classRoom = await prisma.classRoom.findUnique({
      where: { id: parseInt(classRoomId) }
    })
    if (!classRoom) return res.status(404).json({ message: 'Classroom not found' })
    if (classRoom.teacherId !== teacherId) return res.status(403).json({ message: 'Access denied' })

    const lesson = await prisma.lesson.create({
      data: {
        title,
        classRoomId: parseInt(classRoomId),
        contentJson: contentJson ?? BLANK_CANVAS
      }
    })
    res.status(201).json({ message: 'Lesson created', lesson })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * GET /api/lessons/:classRoomId
 * Returns all lessons under a classroom.
 * contentJson excluded — list view only.
 */
const getLessons = async (req, res) => {
  try {
    const classRoomId = parseInt(req.params.classRoomId)
    const lessons = await prisma.lesson.findMany({
      where: { classRoomId },
      select: {
        id: true,
        title: true,
        classRoomId: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'asc' }
    })
    res.json(lessons)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * GET /api/lessons/lesson/:id
 * Returns a single lesson with full contentJson.
 * Used by the canvas editor and student lesson viewer.
 */
const getLesson = async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const lesson = await prisma.lesson.findUnique({ where: { id } })
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' })
    res.json(lesson)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * PUT /api/lessons/:id
 * Updates lesson title and/or contentJson.
 * Only the owning teacher can update.
 */
const updateLesson = async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const teacherId = req.user.id
    const { title, contentJson } = req.body

    // Verify ownership via classroom
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: { classRoom: true }
    })
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' })
    if (lesson.classRoom.teacherId !== teacherId) return res.status(403).json({ message: 'Access denied' })

    const data = {}
    if (title !== undefined) data.title = title
    if (contentJson !== undefined) data.contentJson = contentJson

    const updated = await prisma.lesson.update({ where: { id }, data })
    res.json({ message: 'Lesson updated', lesson: updated })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * DELETE /api/lessons/:id
 * Deletes a lesson. Only the owning teacher can delete.
 * Progress records cascade deleted automatically.
 */
const deleteLesson = async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const teacherId = req.user.id

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: { classRoom: true }
    })
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' })
    if (lesson.classRoom.teacherId !== teacherId) return res.status(403).json({ message: 'Access denied' })

    await prisma.lesson.delete({ where: { id } })
    res.json({ message: 'Lesson deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { createLesson, getLessons, getLesson, updateLesson, deleteLesson }