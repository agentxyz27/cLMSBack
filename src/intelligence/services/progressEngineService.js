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

// ── Student Progress ───────────────────────────────────────────────────────
// Returns MPS over time for a single student across all lessons
// in the classroom. Each point = one lesson snapshot.
// Sorted by lesson creation order — earliest lesson first.
// Output shape feeds a line chart: x = lesson title, y = mps
const getStudentProgress = async (teacherId, classRoomId, studentId) => {
  const parsedClassRoomId = parseInt(classRoomId)
  const parsedStudentId   = parseInt(studentId)

  const classRoom = await verifyClassRoomOwnership(teacherId, parsedClassRoomId)

  // Verify student belongs to this classroom's section
  const student = await prisma.student.findUnique({
    where: { id: parsedStudentId }
  })
  if (!student) throw { status: 404, message: 'Student not found' }
  if (student.sectionId !== classRoom.sectionId)
    throw { status: 403, message: 'Student does not belong to this classroom' }

  // Get all lessons in this classroom ordered by creation
  const lessons = await prisma.lesson.findMany({
    where:   { classRoomId: parsedClassRoomId },
    orderBy: { createdAt: 'asc' },
    select:  { id: true, title: true, createdAt: true }
  })

  // Get all snapshots for this student in this classroom's lessons
  const snapshots = await prisma.studentLessonSnapshot.findMany({
    where: {
      studentId: parsedStudentId,
      lessonId:  { in: lessons.map(l => l.id) }
    },
    orderBy: { snapshotAt: 'asc' }
  })

  // Map snapshots to lesson order
  const snapshotMap = new Map(snapshots.map(s => [s.lessonId, s]))

  const trend = lessons.map(lesson => {
    const snapshot = snapshotMap.get(lesson.id)
    return {
      lessonId:    lesson.id,
      lessonTitle: lesson.title,
      mps:         snapshot?.mps          ?? null, // null = not completed yet
      isAtRisk:    snapshot?.isAtRisk     ?? null,
      avgAttempts: snapshot?.avgAttempts  ?? null,
      snapshotAt:  snapshot?.snapshotAt   ?? null,
      completed:   !!snapshot
    }
  })

  // Compute overall improvement if at least 2 data points
  const completed = trend.filter(t => t.completed)
  let improvement = null
  if (completed.length >= 2) {
    const first = completed[0].mps
    const last  = completed[completed.length - 1].mps
    improvement = parseFloat((last - first).toFixed(2))
  }

  return {
    studentId: parsedStudentId,
    name:      student.name,
    improvement,
    trend
  }
}

// ── Class Progress ─────────────────────────────────────────────────────────
// Returns class avgMps over time for a specific lesson.
// Each point = one ClassLessonSnapshot (teacher triggered "Generate Report").
// Multiple snapshots over time = trend data for the line chart.
// x = snapshotAt, y = avgMps
const getClassProgress = async (teacherId, classRoomId, lessonId) => {
  const parsedClassRoomId = parseInt(classRoomId)
  const parsedLessonId    = parseInt(lessonId)

  await verifyClassRoomOwnership(teacherId, parsedClassRoomId)

  const snapshots = await prisma.classLessonSnapshot.findMany({
    where: {
      classRoomId: parsedClassRoomId,
      lessonId:    parsedLessonId
    },
    orderBy: { snapshotAt: 'asc' },
    include: {
      triggeredBy: { select: { id: true, name: true } }
    }
  })

  if (snapshots.length === 0) return { total: 0, trend: [] }

  // Compute improvement between first and last snapshot
  const first = snapshots[0].avgMps
  const last  = snapshots[snapshots.length - 1].avgMps
  const improvement = parseFloat((last - first).toFixed(2))

  const trend = snapshots.map(s => ({
    snapshotId:     s.id,
    avgMps:         s.avgMps,
    lowestMps:      s.lowestMps,
    highestMps:     s.highestMps,
    atRiskCount:    s.atRiskCount,
    completedCount: s.completedCount,
    totalStudents:  s.totalStudents,
    triggeredBy:    s.triggeredBy?.name ?? 'System',
    snapshotAt:     s.snapshotAt
  }))

  return {
    total: snapshots.length,
    improvement,
    trend
  }
}

// ── Improvement Report ─────────────────────────────────────────────────────
// For each at-risk student in a lesson, compares their snapshot MPS
// against the class snapshot avgMps at that time.
// Checks if AssignedActivity was COMPLETED after the snapshot.
// Reports whether remediation correlated with improvement.
//
// Output shape:
//   improved   → student MPS went up after remediation
//   noChange   → student MPS stayed the same or dropped
//   noData     → student hasn't retaken / no follow-up snapshot
const getImprovementReport = async (teacherId, classRoomId, lessonId) => {
  const parsedClassRoomId = parseInt(classRoomId)
  const parsedLessonId    = parseInt(lessonId)

  const classRoom = await verifyClassRoomOwnership(teacherId, parsedClassRoomId)

  // Get all at-risk snapshots for this lesson
  const atRiskSnapshots = await prisma.studentLessonSnapshot.findMany({
    where: {
      lessonId: parsedLessonId,
      isAtRisk: true,
      student:  { sectionId: classRoom.sectionId }
    },
    include: {
      student: { select: { id: true, name: true } }
    }
  })

  if (atRiskSnapshots.length === 0)
    return { total: 0, improved: [], noChange: [], noData: [] }

  // Get all lessons in classroom ordered by creation (for follow-up lookup)
  const lessons = await prisma.lesson.findMany({
    where:   { classRoomId: parsedClassRoomId },
    orderBy: { createdAt: 'asc' },
    select:  { id: true, createdAt: true }
  })

  const lessonIndex   = lessons.findIndex(l => l.id === parsedLessonId)
  const followUpLessons = lessons.slice(lessonIndex + 1).map(l => l.id)

  const improved  = []
  const noChange  = []
  const noData    = []

  for (const snapshot of atRiskSnapshots) {
    const studentId = snapshot.student.id

    // Check if student has a completed AssignedActivity after this snapshot
    const completedActivity = await prisma.assignedActivity.findFirst({
      where: {
        studentId,
        status:      'COMPLETED',
        completedAt: { gt: snapshot.snapshotAt }
      }
    })

    // Check if student has a follow-up snapshot in a later lesson
    const followUpSnapshot = await prisma.studentLessonSnapshot.findFirst({
      where: {
        studentId,
        lessonId: { in: followUpLessons }
      },
      orderBy: { snapshotAt: 'asc' }
    })

    const entry = {
      studentId:          studentId,
      name:               snapshot.student.name,
      originalMps:        snapshot.mps,
      originalSnapshotAt: snapshot.snapshotAt,
      remediationDone:    !!completedActivity,
      followUpMps:        followUpSnapshot?.mps ?? null,
      followUpLesson:     followUpSnapshot?.lessonId ?? null,
      followUpAt:         followUpSnapshot?.snapshotAt ?? null
    }

    if (!followUpSnapshot) {
      noData.push(entry)
    } else if (followUpSnapshot.mps > snapshot.mps) {
      improved.push({ ...entry, mpsDelta: parseFloat((followUpSnapshot.mps - snapshot.mps).toFixed(2)) })
    } else {
      noChange.push({ ...entry, mpsDelta: parseFloat((followUpSnapshot.mps - snapshot.mps).toFixed(2)) })
    }
  }

  return {
    total:    atRiskSnapshots.length,
    improved,
    noChange,
    noData
  }
}

// ── Heatmap Data ───────────────────────────────────────────────────────────
// Returns student × lesson MPS grid for the entire classroom.
// Shape: rows = students, columns = lessons, cells = mps value (null if not done)
// Frontend renders this as a color-coded heatmap.
const getHeatmap = async (teacherId, classRoomId) => {
  const parsedClassRoomId = parseInt(classRoomId)

  const classRoom = await verifyClassRoomOwnership(teacherId, parsedClassRoomId)

  // Get all lessons in classroom ordered by creation
  const lessons = await prisma.lesson.findMany({
    where:   { classRoomId: parsedClassRoomId },
    orderBy: { createdAt: 'asc' },
    select:  { id: true, title: true }
  })

  // Get all students in section
  const students = await prisma.student.findMany({
    where:   { sectionId: classRoom.sectionId },
    orderBy: { name: 'asc' },
    select:  { id: true, name: true }
  })

  // Get all snapshots for this classroom
  const snapshots = await prisma.studentLessonSnapshot.findMany({
    where: {
      lessonId:  { in: lessons.map(l => l.id) },
      studentId: { in: students.map(s => s.id) }
    }
  })

  // Build lookup map: studentId_lessonId → mps
  const snapshotMap = new Map(
    snapshots.map(s => [`${s.studentId}_${s.lessonId}`, s.mps])
  )

  // Build grid
  const grid = students.map(student => ({
    studentId: student.id,
    name:      student.name,
    scores:    lessons.map(lesson => ({
      lessonId:    lesson.id,
      lessonTitle: lesson.title,
      mps:         snapshotMap.get(`${student.id}_${lesson.id}`) ?? null
    }))
  }))

  return {
    lessons: lessons.map(l => ({ id: l.id, title: l.title })),
    students: grid
  }
}

module.exports = {
  getStudentProgress,
  getClassProgress,
  getImprovementReport,
  getHeatmap
}