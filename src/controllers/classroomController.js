/**
 * classroomController.js
 *
 * createClassRoom  → teacher self-assigns to a subject + section
 * getMyClassRooms  → teacher gets all their classrooms
 * getClassRoom     → teacher gets a single classroom with lessons
 */
const classroomService = require('../services/classroomService')

const createClassRoom = async (req, res) => {
  try {
    const classRoom = await classroomService.createClassRoom(req.user.id, req.body)
    res.status(201).json({ message: 'Classroom created', classRoom })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

const getMyClassRooms = async (req, res) => {
  try {
    const classRooms = await classroomService.getMyClassRooms(req.user.id)
    res.json(classRooms)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

const getClassRoom = async (req, res) => {
  try {
    const classRoom = await classroomService.getClassRoom(req.user.id, req.params.id)
    res.json(classRoom)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

const getSectionClassRooms = async (req, res) => {
  try {
    const sectionId = req.user.sectionId
    if (!sectionId) return res.status(400).json({ message: 'No section assigned' })
    const classRooms = await classroomService.getSectionClassRooms(sectionId)
    res.json(classRooms)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

const getClassRoomLessons = async (req, res) => {
  try {
    const sectionId = req.user.sectionId
    const lessons = await classroomService.getClassRoomLessons(sectionId, req.params.id)
    res.json(lessons)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

module.exports = { createClassRoom, getMyClassRooms, getClassRoom, getSectionClassRooms, getClassRoomLessons }