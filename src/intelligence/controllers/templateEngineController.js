const templateEngineService = require('../services/templateEngineService')

// ── Find Template ──────────────────────────────────────────────────────────
// Returns the best matching template for a topic + difficulty.
// Used internally before assigning remediation.
const findTemplate = async (req, res) => {
  try {
    const result = await templateEngineService.findTemplate(
      req.query.topicId,
      req.query.difficulty
    )
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Get Templates By Topic ─────────────────────────────────────────────────
// Returns all templates for a topic.
// Teacher browses before manually assigning.
const getTemplatesByTopic = async (req, res) => {
  try {
    const result = await templateEngineService.getTemplatesByTopic(
      req.params.topicId
    )
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Assign Remediation ─────────────────────────────────────────────────────
// Teacher clicks "Assign Remediation" on a flagged student.
// Reads snapshot → finds template → writes AssignedActivity.
const assignRemediation = async (req, res) => {
  try {
    const activity = await templateEngineService.assignRemediation(
      req.user.id,
      req.body
    )
    res.status(201).json({ message: 'Remediation assigned', activity })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Get Assignments ────────────────────────────────────────────────────────
// Returns all AssignedActivities for a student.
// Teacher views remediation history for a student.
const getAssignments = async (req, res) => {
  try {
    const result = await templateEngineService.getAssignments(
      req.user.id,
      req.params.studentId
    )
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Update Assignment Status ───────────────────────────────────────────────
// Student opens activity     → IN_PROGRESS
// Student submits            → COMPLETED
// Teacher dismisses          → ARCHIVED
const updateAssignmentStatus = async (req, res) => {
  try {
    const result = await templateEngineService.updateAssignmentStatus(
      req.user.id,
      req.params.assignmentId,
      req.body.status
    )
    res.json({ message: 'Assignment status updated', activity: result })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Get Classroom Assignments ──────────────────────────────────────────────
// Returns all AssignedActivities across a classroom.
// Teacher sees remediation overview for the whole class.
const getClassroomAssignments = async (req, res) => {
  try {
    const result = await templateEngineService.getClassroomAssignments(
      req.user.id,
      req.params.classRoomId
    )
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

module.exports = {
  findTemplate,
  getTemplatesByTopic,
  assignRemediation,
  getAssignments,
  updateAssignmentStatus,
  getClassroomAssignments
}