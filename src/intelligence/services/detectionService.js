const prisma = require('../../prisma')

// ── Ownership guard ────────────────────────────────────────────────────────
const verifyClassRoomOwnership = async (teacherId, classRoomId) => {
  const classRoom = await prisma.classRoom.findUnique({
    where: { id: classRoomId },
    include: { section: true }
  })

  if (!classRoom) throw { status: 404, message: 'Classroom not found' }
  if (classRoom.teacherId !== teacherId)
    throw { status: 403, message: 'Access denied' }

  return classRoom
}

// ── At-Risk Students ───────────────────────────────────────────────────────
// Returns students where isAtRisk = true for this lesson.
// Sorted by MPS ascending — weakest first.
// Output feeds Focus Engine priority list and dashboard alert cards.
const getAtRiskStudents = async (teacherId, classRoomId, lessonId) => {
  const parsedClassRoomId = parseInt(classRoomId)
  const parsedLessonId    = parseInt(lessonId)

  const classRoom = await verifyClassRoomOwnership(teacherId, parsedClassRoomId)

  const snapshots = await prisma.studentLessonSnapshot.findMany({
    where: {
      lessonId: parsedLessonId,
      isAtRisk: true,
      student:  { sectionId: classRoom.sectionId }
    },
    include: {
      student: { select: { id: true, name: true } }
    },
    orderBy: { mps: 'asc' }
  })

  return {
    total:    snapshots.length,
    students: snapshots.map(s => ({
      studentId:    s.student.id,
      name:         s.student.name,
      mps:          s.mps,
      avgAttempts:  s.avgAttempts,
      avgHintsUsed: s.avgHintsUsed,
      snapshotAt:   s.snapshotAt
    }))
  }
}

// ── Weak Topics ────────────────────────────────────────────────────────────
// Finds topics where students struggled the most in this lesson.
// Reads QuestionAttemptSession grouped by question → topic.
// Computes per-topic: correctRate, avgAttempts, totalAttempts.
// Sorted by correctRate ascending — weakest topic first.
const getWeakTopics = async (teacherId, classRoomId, lessonId) => {
  const parsedClassRoomId = parseInt(classRoomId)
  const parsedLessonId    = parseInt(lessonId)

  const classRoom = await verifyClassRoomOwnership(teacherId, parsedClassRoomId)

  // Get all finished sessions for this lesson's questions, for students in this section
  const sessions = await prisma.questionAttemptSession.findMany({
    where: {
      isSubmitted: true,
      question: { lessonId: parsedLessonId },
      student:  { sectionId: classRoom.sectionId }
    },
    include: {
      question: {
        include: {
          topic: { select: { id: true, name: true } }
        }
      }
    }
  })

  if (sessions.length === 0) return { total: 0, topics: [] }

  // Group sessions by topic
  const topicMap = new Map()

  for (const session of sessions) {
    const topic   = session.question.topic
    const topicId = topic.id

    if (!topicMap.has(topicId)) {
      topicMap.set(topicId, {
        topicId,
        topicName:     topic.name,
        totalSessions: 0,
        correctCount:  0,
        totalAttempts: 0,
        totalHints:    0
      })
    }

    const entry = topicMap.get(topicId)
    entry.totalSessions++
    entry.totalAttempts += session.attempts
    entry.totalHints    += session.hintsUsed
    if (session.correct) entry.correctCount++
  }

  // Compute rates and sort by correctRate ascending (weakest first)
  const topics = Array.from(topicMap.values())
    .map(t => ({
      topicId:      t.topicId,
      topicName:    t.topicName,
      correctRate:  parseFloat(((t.correctCount / t.totalSessions) * 100).toFixed(2)),
      avgAttempts:  parseFloat((t.totalAttempts / t.totalSessions).toFixed(2)),
      avgHints:     parseFloat((t.totalHints / t.totalSessions).toFixed(2)),
      totalStudents: t.totalSessions
    }))
    .sort((a, b) => a.correctRate - b.correctRate)

  return { total: topics.length, topics }
}

// ── Regression Alerts ──────────────────────────────────────────────────────
// Detects students whose MPS dropped between snapshots.
// Compares the two most recent StudentLessonSnapshots per student.
// A drop means the student got worse — needs immediate attention.
// Note: Regression across lessons requires multiple snapshots per student.
// This compares snapshot history for the same lesson over time if re-snapshotted,
// or can be extended to compare across lessons in the same classroom.
const getRegressionAlerts = async (teacherId, classRoomId, lessonId) => {
  const parsedClassRoomId = parseInt(classRoomId)
  const parsedLessonId    = parseInt(lessonId)

  const classRoom = await verifyClassRoomOwnership(teacherId, parsedClassRoomId)

  // Get all lessons in this classroom ordered by creation
  const lessons = await prisma.lesson.findMany({
    where:   { classRoomId: parsedClassRoomId },
    orderBy: { createdAt: 'asc' },
    select:  { id: true, title: true }
  })

  // Get all students in section
  const students = await prisma.student.findMany({
    where:  { sectionId: classRoom.sectionId },
    select: { id: true, name: true }
  })

  const regressions = []

  for (const student of students) {
    // Get last 2 snapshots across all lessons in this classroom for this student
    const snapshots = await prisma.studentLessonSnapshot.findMany({
      where: {
        studentId: student.id,
        lessonId:  { in: lessons.map(l => l.id) }
      },
      orderBy: { snapshotAt: 'desc' },
      take:    2,
      include: {
        lesson: { select: { id: true, title: true } }
      }
    })

    // Need at least 2 snapshots to detect regression
    if (snapshots.length < 2) continue

    const [latest, previous] = snapshots
    const drop = previous.mps - latest.mps

    // Only flag if MPS dropped by more than 5 points
    if (drop > 5) {
      regressions.push({
        studentId:    student.id,
        name:         student.name,
        previousMps:  previous.mps,
        previousLesson: previous.lesson.title,
        latestMps:    latest.mps,
        latestLesson: latest.lesson.title,
        drop:         parseFloat(drop.toFixed(2)),
        snapshotAt:   latest.snapshotAt
      })
    }
  }

  // Sort by drop descending — biggest regression first
  regressions.sort((a, b) => b.drop - a.drop)

  return { total: regressions.length, regressions }
}

// ── Class Summary ──────────────────────────────────────────────────────────
// Combines all three detection outputs into one response.
// Designed for the teacher dashboard detection panel.
// Single API call instead of three separate ones.
const getClassSummary = async (teacherId, classRoomId, lessonId) => {
  const [atRisk, weakTopics, regression] = await Promise.all([
    getAtRiskStudents(teacherId, classRoomId, lessonId),
    getWeakTopics(teacherId, classRoomId, lessonId),
    getRegressionAlerts(teacherId, classRoomId, lessonId)
  ])

  return {
    atRisk,
    weakTopics,
    regression
  }
}

module.exports = {
  getAtRiskStudents,
  getWeakTopics,
  getRegressionAlerts,
  getClassSummary
}