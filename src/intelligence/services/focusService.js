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

// ── Priority List ──────────────────────────────────────────────────────────
// Ranks all students by urgency for this lesson.
// Priority order:
//   1. isAtRisk = true, sorted by mps ascending (weakest at-risk first)
//   2. isAtRisk = false, sorted by mps ascending (weakest passing next)
// Each student gets a priority tier: 'urgent' | 'watch' | 'good'
//   urgent → isAtRisk = true, mps < 75
//   watch  → isAtRisk = false, mps < 90
//   good   → mps >= 90
const getPriorityList = async (teacherId, classRoomId, lessonId) => {
  const parsedClassRoomId = parseInt(classRoomId)
  const parsedLessonId    = parseInt(lessonId)

  const classRoom = await verifyClassRoomOwnership(teacherId, parsedClassRoomId)

  const snapshots = await prisma.studentLessonSnapshot.findMany({
    where: {
      lessonId: parsedLessonId,
      student:  { sectionId: classRoom.sectionId }
    },
    include: {
      student: { select: { id: true, name: true } }
    },
    orderBy: { mps: 'asc' }
  })

  const students = snapshots.map(s => ({
    studentId:    s.student.id,
    name:         s.student.name,
    mps:          s.mps,
    avgAttempts:  s.avgAttempts,
    avgHintsUsed: s.avgHintsUsed,
    isAtRisk:     s.isAtRisk,
    priority:     s.isAtRisk ? 'urgent' : s.mps < 90 ? 'watch' : 'good',
    snapshotAt:   s.snapshotAt
  }))

  // Count students who haven't completed the lesson yet
  const totalStudents = await prisma.student.count({
    where: { sectionId: classRoom.sectionId }
  })
  const notStarted = totalStudents - snapshots.length

  return {
    totalStudents,
    completed:  snapshots.length,
    notStarted,
    urgent:     students.filter(s => s.priority === 'urgent').length,
    watch:      students.filter(s => s.priority === 'watch').length,
    good:       students.filter(s => s.priority === 'good').length,
    students
  }
}

// ── Class Weak Spots ───────────────────────────────────────────────────────
// Returns top 3 weakest topics for the class.
// Reads QuestionAttemptSession grouped by topic.
// Only surfaces topics where correctRate < 80% — actionable weak spots.
// If all topics are above 80%, returns the bottom 3 regardless.
const getClassWeakSpots = async (teacherId, classRoomId, lessonId) => {
  const parsedClassRoomId = parseInt(classRoomId)
  const parsedLessonId    = parseInt(lessonId)

  const classRoom = await verifyClassRoomOwnership(teacherId, parsedClassRoomId)

  const sessions = await prisma.questionAttemptSession.findMany({
    where: {
      isSubmitted: true,
      question:    { lessonId: parsedLessonId },
      student:     { sectionId: classRoom.sectionId }
    },
    include: {
      question: {
        include: {
          topic: { select: { id: true, name: true } }
        }
      }
    }
  })

  if (sessions.length === 0) return { weakSpots: [] }

  // Group by topic
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

  const topics = Array.from(topicMap.values())
    .map(t => ({
      topicId:     t.topicId,
      topicName:   t.topicName,
      correctRate: parseFloat(((t.correctCount / t.totalSessions) * 100).toFixed(2)),
      avgAttempts: parseFloat((t.totalAttempts / t.totalSessions).toFixed(2)),
      avgHints:    parseFloat((t.totalHints / t.totalSessions).toFixed(2))
    }))
    .sort((a, b) => a.correctRate - b.correctRate)

  // Return top 3 weakest
  const weakSpots = topics.slice(0, 3)

  return { weakSpots }
}

// ── Student Drill Down ─────────────────────────────────────────────────────
// Returns per-question breakdown for a single student in a lesson.
// Shows exactly which questions they struggled with, how many attempts,
// how many hints, and whether they got it correct.
// Sorted by attempts descending — hardest questions for this student first.
const getStudentDrillDown = async (teacherId, classRoomId, studentId, lessonId) => {
  const parsedClassRoomId = parseInt(classRoomId)
  const parsedStudentId   = parseInt(studentId)
  const parsedLessonId    = parseInt(lessonId)

  const classRoom = await verifyClassRoomOwnership(teacherId, parsedClassRoomId)

  // Verify student belongs to this classroom's section
  const student = await prisma.student.findUnique({
    where: { id: parsedStudentId }
  })
  if (!student) throw { status: 404, message: 'Student not found' }
  if (student.sectionId !== classRoom.sectionId)
    throw { status: 403, message: 'Student does not belong to this classroom' }

  // Get snapshot for overall MPS
  const snapshot = await prisma.studentLessonSnapshot.findFirst({
    where: {
      studentId: parsedStudentId,
      lessonId:  parsedLessonId
    }
  })

  // Get all sessions for this student in this lesson
  const sessions = await prisma.questionAttemptSession.findMany({
    where: {
      studentId:   parsedStudentId,
      isSubmitted: true,
      question:    { lessonId: parsedLessonId }
    },
    include: {
      question: {
        include: {
          topic: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { attempts: 'desc' }
  })

  const questions = sessions.map(s => ({
    questionId:   s.questionId,
    topicId:      s.question.topic.id,
    topicName:    s.question.topic.name,
    templateType: s.question.templateType,
    order:        s.question.order,
    correct:      s.correct,
    attempts:     s.attempts,
    hintsUsed:    s.hintsUsed,
    startedAt:    s.startedAt,
    submittedAt:  s.submittedAt
  }))

  return {
    studentId:  parsedStudentId,
    name:       student.name,
    mps:        snapshot?.mps ?? null,
    isAtRisk:   snapshot?.isAtRisk ?? null,
    snapshotAt: snapshot?.snapshotAt ?? null,
    questions
  }
}

// ── Focus Summary ──────────────────────────────────────────────────────────
// Combines priority list and class weak spots in one call.
const getFocusSummary = async (teacherId, classRoomId, lessonId) => {
  const [priorityList, classWeakSpots] = await Promise.all([
    getPriorityList(teacherId, classRoomId, lessonId),
    getClassWeakSpots(teacherId, classRoomId, lessonId)
  ])

  return {
    priorityList,
    classWeakSpots
  }
}

module.exports = {
  getPriorityList,
  getClassWeakSpots,
  getStudentDrillDown,
  getFocusSummary
}