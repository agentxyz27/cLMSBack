const detectionService = require('../services/detectionService')

// ── At-Risk Students ───────────────────────────────────────────────────────
// Returns all students in the classroom flagged as at-risk for a lesson.
// Source: StudentLessonSnapshot.isAtRisk = true
const getAtRiskStudents = async (req, res) => {
  try {
    const result = await detectionService.getAtRiskStudents(
      req.user.id,
      req.params.classRoomId,
      req.params.lessonId
    )
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Weak Topics ────────────────────────────────────────────────────────────
// Returns topics ranked by weakness across the class for a lesson.
// Source: QuestionAttemptSession grouped by topicId
const getWeakTopics = async (req, res) => {
  try {
    const result = await detectionService.getWeakTopics(
      req.user.id,
      req.params.classRoomId,
      req.params.lessonId
    )
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Regression Alerts ──────────────────────────────────────────────────────
// Returns students whose MPS dropped between the last two snapshots.
// Source: StudentLessonSnapshot ordered by snapshotAt desc (last 2 per student)
const getRegressionAlerts = async (req, res) => {
  try {
    const result = await detectionService.getRegressionAlerts(
      req.user.id,
      req.params.classRoomId,
      req.params.lessonId
    )
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Class Summary ──────────────────────────────────────────────────────────
// Returns a full detection summary for a classroom + lesson.
// Combines at-risk, weak topics, and regression in one call.
// Used to populate the detection panel on the teacher dashboard.
const getClassSummary = async (req, res) => {
  try {
    const result = await detectionService.getClassSummary(
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
  getAtRiskStudents,
  getWeakTopics,
  getRegressionAlerts,
  getClassSummary
}