const subjectService = require('../services/subjectService')

const getAllSubjects = async (req, res) => {
  try {
    const subjects = await subjectService.getAllSubjects()
    res.json(subjects)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

module.exports = { getAllSubjects }