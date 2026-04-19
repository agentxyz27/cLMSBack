/**
 * authController.js
 */
const authService = require('../services/authService')

const registerTeacher = async (req, res) => {
  try {
    const user = await authService.register('teacher', req.body)
    res.status(201).json({ message: 'Teacher registered', user })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

const loginTeacher = async (req, res) => {
  try {
    const result = await authService.login('teacher', req.body)
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

const registerStudent = async (req, res) => {
  try {
    const user = await authService.register('student', req.body)
    res.status(201).json({ message: 'Student registered', user })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

const loginStudent = async (req, res) => {
  try {
    const result = await authService.login('student', req.body)
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

const getMe = async (req, res) => {
  try {
    const user = await authService.getMe(req.user)
    res.json(user)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

module.exports = {
  registerTeacher, loginTeacher,
  registerStudent, loginStudent,
  getMe
}