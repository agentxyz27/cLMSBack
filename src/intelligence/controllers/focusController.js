const focusService = require('../services/focusService')

// ── Priority List ──────────────────────────────────────────────────────────
// Returns students ranked by urgency — weakest MPS first.
// Teacher sees who needs attention most at the top.
const getPriorityList = async (req, res) => {
  try {
    const result = await focusService.getPriorityList(
      req.user.id,
      req.params.classRoomId,
      req.params.lessonId
    )
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Class Weak Spots ───────────────────────────────────────────────────────
// Returns the top N weakest topics for the class.
// Tells the teacher where the whole class is struggling.
const getClassWeakSpots = async (req, res) => {
  try {
    const result = await focusService.getClassWeakSpots(
      req.user.id,
      req.params.classRoomId,
      req.params.lessonId
    )
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Student Drill Down ─────────────────────────────────────────────────────
// Returns a detailed breakdown for a single student.
// Shows per-question performance — which questions they struggled with most.
const getStudentDrillDown = async (req, res) => {
  try {
    const result = await focusService.getStudentDrillDown(
      req.user.id,
      req.params.classRoomId,
      req.params.studentId,
      req.params.lessonId
    )
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Focus Summary ──────────────────────────────────────────────────────────
// Combines priority list and class weak spots in one call.
// Used to populate the focus panel on the teacher dashboard.
const getFocusSummary = async (req, res) => {
  try {
    const result = await focusService.getFocusSummary(
      req.user.id,
      req.params.classRoomId,
      req.params.lessonId
    )
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

module.exports = {
  getPriorityList,
  getClassWeakSpots,
  getStudentDrillDown,
  getFocusSummary
}