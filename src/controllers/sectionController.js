/**
 * sectionController.js
 *
 * getAllSections → returns all grades with their sections
 *                  used by the registration form dropdown
 */
const sectionService = require('../services/sectionService')

const getAllSections = async (req, res) => {
  try {
    const sections = await sectionService.getAllSections()
    res.json(sections)
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
}

module.exports = { getAllSections }