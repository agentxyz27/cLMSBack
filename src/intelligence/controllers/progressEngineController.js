const progressEngineService = require('../services/progressEngineService')

// ── Student Progress ───────────────────────────────────────────────────────
// Returns MPS over time for a single student across all lessons.
// Feeds the student progress line chart.
const getStudentProgress = async (req, res) => {
  try {
    const result = await progressEngineService.getStudentProgress(
      req.user.id,
      req.params.classRoomId,
      req.params.studentId
    )
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Class Progress ─────────────────────────────────────────────────────────
// Returns class avgMps over time for a lesson.
// Reads ClassLessonSnapshot history — feeds line chart.
const getClassProgress = async (req, res) => {
  try {
    const result = await progressEngineService.getClassProgress(
      req.user.id,
      req.params.classRoomId,
      req.params.lessonId
    )
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Improvement Report ─────────────────────────────────────────────────────
// Compares MPS before and after remediation for at-risk students.
// Did the assigned activity actually help?
const getImprovementReport = async (req, res) => {
  try {
    const result = await progressEngineService.getImprovementReport(
      req.user.id,
      req.params.classRoomId,
      req.params.lessonId
    )
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Heatmap Data ───────────────────────────────────────────────────────────
// Returns student × lesson MPS grid for the classroom.
// Feeds the heatmap chart on the teacher dashboard.
const getHeatmap = async (req, res) => {
  try {
    const result = await progressEngineService.getHeatmap(
      req.user.id,
      req.params.classRoomId
    )
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

module.exports = {
  getStudentProgress,
  getClassProgress,
  getImprovementReport,
  getHeatmap
}