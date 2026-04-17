const authService = require('../services/authService')

/**
 * TEACHER
 */
const registerTeacher = async (req, res) => {
  try {
    const { name, email, password } = req.body

    const teacher = await authService.registerTeacher({
      name,
      email,
      password
    })

    res.status(201).json({
      message: 'Teacher registered',
      teacher
    })
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message || 'Server error'
    })
  }
}

const loginTeacher = async (req, res) => {
  try {
    const { email, password } = req.body

    const result = await authService.loginTeacher({
      email,
      password
    })

    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message || 'Server error'
    })
  }
}

/**
 * STUDENT
 */
const registerStudent = async (req, res) => {
  try {
    const { name, email, password, lrn } = req.body

    const student = await authService.registerStudent({
      name,
      email,
      password,
      lrn
    })

    res.status(201).json({
      message: 'Student registered',
      student
    })
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message || 'Server error'
    })
  }
}

const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body

    const result = await authService.loginStudent({
      email,
      password
    })

    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message || 'Server error'
    })
  }
}

/**
 * ADMIN
 */
const registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body

    const admin = await authService.registerAdmin({
      name,
      email,
      password
    })

    res.status(201).json({
      message: 'Admin registered',
      admin
    })
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message || 'Server error'
    })
  }
}

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body

    const result = await authService.loginAdmin({
      email,
      password
    })

    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message || 'Server error'
    })
  }
}

/**
 * PROFILE
 */
const getMe = async (req, res) => {
  try {
    const user = await authService.getMe(req.user)

    res.json(user)
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message || 'Server error'
    })
  }
}

module.exports = {
  registerTeacher,
  loginTeacher,
  registerStudent,
  loginStudent,
  registerAdmin,
  loginAdmin,
  getMe
}