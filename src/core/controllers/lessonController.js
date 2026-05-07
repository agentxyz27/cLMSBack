const lessonService = require('../services/lessonService')

const createLesson = async (req, res) => {
  try {
    const lesson = await lessonService.createLesson(req.user.id, req.body)
    res.status(201).json({ message: 'Lesson created', lesson })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

const getLessons = async (req, res) => {
  try {
    const lessons = await lessonService.getLessons(req.params.classRoomId)
    res.json(lessons)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const getLesson = async (req, res) => {
  try {
    const lesson = await lessonService.getLesson(req.params.id)
    res.json(lesson)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

const updateLesson = async (req, res) => {
  try {
    const updated = await lessonService.updateLesson(
      req.user.id,
      req.params.id,
      req.body
    )
    res.json({ message: 'Lesson updated', lesson: updated })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

const deleteLesson = async (req, res) => {
  try {
    await lessonService.deleteLesson(req.user.id, req.params.id)
    res.json({ message: 'Lesson deleted' })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

module.exports = {
  createLesson,
  getLessons,
  getLesson,
  updateLesson,
  deleteLesson
}