const snapshotService = require('../services/snapshotService')

// ── Generate Class Report ──────────────────────────────────────────────────
// Teacher clicks "Generate Report" on the dashboard.
// Reads all StudentLessonSnapshots for the classroom + lesson.
// Writes a ClassLessonSnapshot — immutable class-level MPS record.
const generateClassSnapshot = async (req, res) => {
  try {
    const snapshot = await snapshotService.generateClassSnapshot(
      req.user.id,
      req.params.classRoomId,
      req.params.lessonId
    )
    res.status(201).json({ message: 'Class report generated', snapshot })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Get Class Snapshots ────────────────────────────────────────────────────
// Returns all ClassLessonSnapshots for a classroom + lesson over time.
// Feeds the Progress Engine line chart (avgMps over time).
const getClassSnapshots = async (req, res) => {
  try {
    const snapshots = await snapshotService.getClassSnapshots(
      req.user.id,
      req.params.classRoomId,
      req.params.lessonId
    )
    res.json(snapshots)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Get Student Snapshots ──────────────────────────────────────────────────
// Returns all StudentLessonSnapshots for a classroom + lesson.
// Feeds Detection, Focus, and heatmap charts.
const getStudentSnapshots = async (req, res) => {
  try {
    const snapshots = await snapshotService.getStudentSnapshots(
      req.user.id,
      req.params.classRoomId,
      req.params.lessonId
    )
    res.json(snapshots)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Get Latest Class Snapshot ──────────────────────────────────────────────
// Returns the most recent ClassLessonSnapshot for a classroom + lesson.
// Feeds the dashboard stat cards (avgMps, atRiskCount, completedCount).
const getLatestClassSnapshot = async (req, res) => {
  try {
    const snapshot = await snapshotService.getLatestClassSnapshot(
      req.user.id,
      req.params.classRoomId,
      req.params.lessonId
    )
    res.json(snapshot)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

module.exports = {
  generateClassSnapshot,
  getClassSnapshots,
  getStudentSnapshots,
  getLatestClassSnapshot
}