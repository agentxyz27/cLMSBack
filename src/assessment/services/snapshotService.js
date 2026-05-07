const prisma = require('../../prisma')

// ── Ownership guard ────────────────────────────────────────────────────────
// Verifies the classroom belongs to the requesting teacher.
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

// ── Generate Class Snapshot ────────────────────────────────────────────────
// Triggered by teacher clicking "Generate Report".
// Reads all StudentLessonSnapshots for the classroom + lesson.
// Aggregates into a single ClassLessonSnapshot row.
// No unique constraint — multiple snapshots over time = trend data.
const generateClassSnapshot = async (teacherId, classRoomId, lessonId) => {
  const parsedClassRoomId = parseInt(classRoomId)
  const parsedLessonId    = parseInt(lessonId)

  const classRoom = await verifyClassRoomOwnership(teacherId, parsedClassRoomId)

  // Verify lesson belongs to this classroom
  const lesson = await prisma.lesson.findUnique({
    where: { id: parsedLessonId }
  })
  if (!lesson) throw { status: 404, message: 'Lesson not found' }
  if (lesson.classRoomId !== parsedClassRoomId)
    throw { status: 403, message: 'Lesson does not belong to this classroom' }

  // Get total students in section
  const totalStudents = await prisma.student.count({
    where: { sectionId: classRoom.sectionId }
  })

  // Get all StudentLessonSnapshots for this classroom's section + lesson
  const studentSnapshots = await prisma.studentLessonSnapshot.findMany({
    where: {
      lessonId: parsedLessonId,
      student: { sectionId: classRoom.sectionId }
    },
    select: {
      mps:      true,
      isAtRisk: true
    }
  })

  // No snapshots yet — no students have finished the lesson
  if (studentSnapshots.length === 0)
    throw { status: 400, message: 'No student snapshots found — no students have completed this lesson yet' }

  const completedCount = studentSnapshots.length
  const mpsValues      = studentSnapshots.map(s => s.mps)
  const avgMps         = mpsValues.reduce((sum, m) => sum + m, 0) / completedCount
  const lowestMps      = Math.min(...mpsValues)
  const highestMps     = Math.max(...mpsValues)
  const atRiskCount    = studentSnapshots.filter(s => s.isAtRisk).length

  const snapshot = await prisma.classLessonSnapshot.create({
    data: {
      classRoomId:    parsedClassRoomId,
      lessonId:       parsedLessonId,
      triggeredById:  teacherId,
      totalStudents,
      completedCount,
      avgMps,
      lowestMps,
      highestMps,
      atRiskCount
    }
  })

  return snapshot
}

// ── Get Class Snapshots ────────────────────────────────────────────────────
// Returns all ClassLessonSnapshots for a classroom + lesson ordered by time.
// Feeds the Progress Engine line chart.
const getClassSnapshots = async (teacherId, classRoomId, lessonId) => {
  const parsedClassRoomId = parseInt(classRoomId)
  const parsedLessonId    = parseInt(lessonId)

  await verifyClassRoomOwnership(teacherId, parsedClassRoomId)

  return prisma.classLessonSnapshot.findMany({
    where: {
      classRoomId: parsedClassRoomId,
      lessonId:    parsedLessonId
    },
    orderBy: { snapshotAt: 'asc' }
  })
}

// ── Get Student Snapshots ──────────────────────────────────────────────────
// Returns all StudentLessonSnapshots for this classroom's section + lesson.
// Feeds Detection Engine, Focus Engine, heatmap, scatter, bar ranking.
const getStudentSnapshots = async (teacherId, classRoomId, lessonId) => {
  const parsedClassRoomId = parseInt(classRoomId)
  const parsedLessonId    = parseInt(lessonId)

  const classRoom = await verifyClassRoomOwnership(teacherId, parsedClassRoomId)

  return prisma.studentLessonSnapshot.findMany({
    where: {
      lessonId: parsedLessonId,
      student:  { sectionId: classRoom.sectionId }
    },
    include: {
      student: { select: { id: true, name: true } }
    },
    orderBy: { mps: 'asc' } // ascending — weakest first for Focus Engine
  })
}

// ── Get Latest Class Snapshot ──────────────────────────────────────────────
// Returns the most recent ClassLessonSnapshot for dashboard stat cards.
const getLatestClassSnapshot = async (teacherId, classRoomId, lessonId) => {
  const parsedClassRoomId = parseInt(classRoomId)
  const parsedLessonId    = parseInt(lessonId)

  await verifyClassRoomOwnership(teacherId, parsedClassRoomId)

  const snapshot = await prisma.classLessonSnapshot.findFirst({
    where: {
      classRoomId: parsedClassRoomId,
      lessonId:    parsedLessonId
    },
    orderBy: { snapshotAt: 'desc' }
  })

  if (!snapshot) throw { status: 404, message: 'No report generated yet for this lesson' }

  return snapshot
}

module.exports = {
  generateClassSnapshot,
  getClassSnapshots,
  getStudentSnapshots,
  getLatestClassSnapshot
}