const prisma = require('../../prisma')

// ── In-memory cache ────────────────────────────────────────────────────────
const cache       = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutes

const invalidateClassHealthCache = (classRoomId) => {
  cache.delete(classRoomId)
}

// ── Ownership guard ────────────────────────────────────────────────────────
const verifyClassRoomOwnership = async (teacherId, classRoomId) => {
  const classRoom = await prisma.classRoom.findUnique({
    where:   { id: classRoomId },
    include: { section: true }
  })

  if (!classRoom) throw { status: 404, message: 'Classroom not found' }
  if (classRoom.teacherId !== teacherId)
    throw { status: 403, message: 'Access denied' }

  return classRoom
}

// ── Main computation ───────────────────────────────────────────────────────
// Returns:
//   classHealthScore  → mean MPS across all snapshots in this classroom
//   atRiskCount       → unique students flagged isAtRisk on their latest snapshot
//   atRiskRate        → atRiskCount / totalStudents (0.00 – 1.00)
//   totalStudents     → unique students who have at least one snapshot
//   totalLessons      → lessons that have at least one snapshot
//   mpsTrend          → [ { lessonId, title, avgMps, snapshotAt } ] ordered by lesson.createdAt
//   weakestTopic      → { topicId, topicName, correctRate, avgAttempts, avgHints }
//   strongestTopic    → { topicId, topicName, correctRate, avgAttempts, avgHints }
//   topicHealth       → all topics sorted by correctRate ascending
//   studentHealthList → [ { studentId, name, avgMps, isAtRisk, lessonsCompleted } ]
const computeClassroomHealth = async (teacherId, classRoomId) => {
  const parsedClassRoomId = parseInt(classRoomId)

  const classRoom = await verifyClassRoomOwnership(teacherId, parsedClassRoomId)

  const lessons = await prisma.lesson.findMany({
    where:   { classRoomId: parsedClassRoomId },
    orderBy: { createdAt: 'asc' },
    select:  { id: true, title: true, createdAt: true }
  })

  const emptyResult = {
    classHealthScore:  null,
    atRiskCount:       0,
    atRiskRate:        0,
    totalStudents:     0,
    totalLessons:      0,
    mpsTrend:          [],
    weakestTopic:      null,
    strongestTopic:    null,
    topicHealth:       [],
    studentHealthList: []
  }

  if (lessons.length === 0) return emptyResult

  const lessonIds = lessons.map(l => l.id)

  // ── StudentLessonSnapshots ────────────────────────────────────────────────
  const snapshots = await prisma.studentLessonSnapshot.findMany({
    where: {
      lessonId: { in: lessonIds },
      student:  { sectionId: classRoom.sectionId }
    },
    include: {
      student: { select: { id: true, name: true } }
    },
    orderBy: { snapshotAt: 'asc' }
  })

  if (snapshots.length === 0) return emptyResult

  // ── mpsTrend ──────────────────────────────────────────────────────────────
  const lessonMap = new Map()
  for (const lesson of lessons) {
    lessonMap.set(lesson.id, {
      lessonId:   lesson.id,
      title:      lesson.title,
      createdAt:  lesson.createdAt,
      mpsValues:  [],
      snapshotAt: null
    })
  }
  for (const snap of snapshots) {
    const entry = lessonMap.get(snap.lessonId)
    if (!entry) continue
    entry.mpsValues.push(snap.mps)
    if (!entry.snapshotAt || snap.snapshotAt > entry.snapshotAt) {
      entry.snapshotAt = snap.snapshotAt
    }
  }
  const mpsTrend = Array.from(lessonMap.values())
    .filter(e => e.mpsValues.length > 0)
    .map(e => ({
      lessonId:   e.lessonId,
      title:      e.title,
      avgMps:     parseFloat((e.mpsValues.reduce((a, b) => a + b, 0) / e.mpsValues.length).toFixed(2)),
      snapshotAt: e.snapshotAt
    }))

  // ── classHealthScore ──────────────────────────────────────────────────────
  const allMps = snapshots.map(s => s.mps)
  const classHealthScore = parseFloat(
    (allMps.reduce((a, b) => a + b, 0) / allMps.length).toFixed(2)
  )

  // ── studentHealthList ─────────────────────────────────────────────────────
  const studentMap = new Map()
  for (const snap of snapshots) {
    const sid = snap.student.id
    if (!studentMap.has(sid)) {
      studentMap.set(sid, {
        studentId:        sid,
        name:             snap.student.name,
        mpsValues:        [],
        lessonsCompleted: 0,
        latestSnapshot:   null
      })
    }
    const entry = studentMap.get(sid)
    entry.mpsValues.push(snap.mps)
    entry.lessonsCompleted++
    if (!entry.latestSnapshot || snap.snapshotAt > entry.latestSnapshot.snapshotAt) {
      entry.latestSnapshot = snap
    }
  }
  const studentHealthList = Array.from(studentMap.values())
    .map(s => ({
      studentId:        s.studentId,
      name:             s.name,
      avgMps:           parseFloat((s.mpsValues.reduce((a, b) => a + b, 0) / s.mpsValues.length).toFixed(2)),
      isAtRisk:         s.latestSnapshot?.isAtRisk ?? false,
      lessonsCompleted: s.lessonsCompleted
    }))
    .sort((a, b) => a.avgMps - b.avgMps)

  const totalStudents = studentHealthList.length
  const atRiskCount   = studentHealthList.filter(s => s.isAtRisk).length
  const atRiskRate    = totalStudents > 0
    ? parseFloat((atRiskCount / totalStudents).toFixed(2))
    : 0

  // ── Topic health across all lessons ───────────────────────────────────────
  // Reads QuestionAttemptSession → Question → Topic for all lessons in classroom.
  // Computes correctRate per topic — this is the actual skill signal.
  const attemptSessions = await prisma.questionAttemptSession.findMany({
    where: {
      isSubmitted: true,
      question:    { lessonId: { in: lessonIds } },
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

  const topicMap = new Map()
  for (const session of attemptSessions) {
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

  const topicHealth = Array.from(topicMap.values())
    .map(t => ({
      topicId:     t.topicId,
      topicName:   t.topicName,
      correctRate: parseFloat(((t.correctCount / t.totalSessions) * 100).toFixed(2)),
      avgAttempts: parseFloat((t.totalAttempts / t.totalSessions).toFixed(2)),
      avgHints:    parseFloat((t.totalHints / t.totalSessions).toFixed(2))
    }))
    .sort((a, b) => a.correctRate - b.correctRate)

  const weakestTopic   = topicHealth[0]                        ?? null
  const strongestTopic = topicHealth[topicHealth.length - 1]   ?? null

  return {
    classHealthScore,
    atRiskCount,
    atRiskRate,
    totalStudents,
    totalLessons:      mpsTrend.length,
    mpsTrend,
    weakestTopic,
    strongestTopic,
    topicHealth,
    studentHealthList
  }
}

// ── Public: getClassroomHealth (cache-aware) ───────────────────────────────
const getClassroomHealth = async (teacherId, classRoomId) => {
  const key = parseInt(classRoomId)

  if (cache.has(key)) {
    const cached = cache.get(key)
    const age    = Date.now() - new Date(cached.computedAt).getTime()
    if (age < CACHE_TTL_MS) {
      return { ...cached.data, _cached: true, _computedAt: cached.computedAt }
    }
    cache.delete(key)
  }

  const data = await computeClassroomHealth(teacherId, classRoomId)
  cache.set(key, { data, computedAt: new Date() })

  return { ...data, _cached: false, _computedAt: new Date() }
}


// ── Trend computation ──────────────────────────────────────────────────────
// Separate from the main health computation — called independently so the
// teacher can change time range without refetching stat cards or topic data.
//
// range options:
//   day     → last 24 hours, grouped by hour
//   week    → last 7 days,   grouped by day
//   month   → last 30 days,  grouped by day
//   3months → last 90 days,  grouped by week
//   quarter → last 90 days,  grouped by week
//
// Returns:
//   range   → echoed back
//   points  → [ { label, avgMps, snapshotCount } ] ordered ascending by time
const RANGE_CONFIG = {
  '24h':    { days: 1,   groupBy: 'hour' },
  '3days':  { days: 3,   groupBy: 'day'  },
  '1week':  { days: 7,   groupBy: 'day'  },
  '1month': { days: 30,  groupBy: 'day'  },
  '4months':{ days: 120, groupBy: 'week' }
}

// Returns a bucket key string for a given date and groupBy
const getBucketKey = (date, groupBy) => {
  const d = new Date(date)
  if (groupBy === 'hour') {
    // e.g. "2025-05-11 14:00"
    return `${d.toISOString().slice(0, 13)}:00`
  }
  if (groupBy === 'day') {
    // e.g. "2025-05-11"
    return d.toISOString().slice(0, 10)
  }
  if (groupBy === 'week') {
    // ISO week start (Monday)
    const day  = d.getDay() || 7
    const mon  = new Date(d)
    mon.setDate(d.getDate() - (day - 1))
    return mon.toISOString().slice(0, 10)
  }
  return d.toISOString().slice(0, 10)
}

// Human-readable label for a bucket key
const getBucketLabel = (key, groupBy) => {
  const d = new Date(key)
  if (groupBy === 'hour') {
    return d.toLocaleString('en-PH', { hour: 'numeric', hour12: true, month: 'short', day: 'numeric' })
  }
  if (groupBy === 'day') {
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  }
  if (groupBy === 'week') {
    return `Week of ${d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`
  }
  return key
}

const getClassroomTrend = async (teacherId, classRoomId, range = 'week') => {
  const parsedClassRoomId = parseInt(classRoomId)

  const config = RANGE_CONFIG[range] ?? RANGE_CONFIG['1week']
  const classRoom = await verifyClassRoomOwnership(teacherId, parsedClassRoomId)

  const since = new Date()
  since.setDate(since.getDate() - config.days)

  // Get all lessons in this classroom
  const lessons = await prisma.lesson.findMany({
    where:  { classRoomId: parsedClassRoomId },
    select: { id: true }
  })

  if (lessons.length === 0) return { range, points: [] }

  const lessonIds = lessons.map(l => l.id)

  // Fetch snapshots within the time window
  const snapshots = await prisma.studentLessonSnapshot.findMany({
    where: {
      lessonId:   { in: lessonIds },
      student:    { sectionId: classRoom.sectionId },
      snapshotAt: { gte: since }
    },
    select: { mps: true, snapshotAt: true },
    orderBy: { snapshotAt: 'asc' }
  })

  if (snapshots.length === 0) return { range, points: [] }

  // Group by bucket
  const bucketMap = new Map()
  for (const snap of snapshots) {
    const key = getBucketKey(snap.snapshotAt, config.groupBy)
    if (!bucketMap.has(key)) {
      bucketMap.set(key, { mpsValues: [], key })
    }
    bucketMap.get(key).mpsValues.push(snap.mps)
  }

  // Sort buckets chronologically and compute avgMps per bucket
  const points = Array.from(bucketMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { mpsValues }]) => ({
      label:         getBucketLabel(key, config.groupBy),
      avgMps:        parseFloat((mpsValues.reduce((a, b) => a + b, 0) / mpsValues.length).toFixed(2)),
      snapshotCount: mpsValues.length
    }))

  return { range, points }
}

module.exports = {
  getClassroomHealth,
  getClassroomTrend,
  invalidateClassHealthCache
}