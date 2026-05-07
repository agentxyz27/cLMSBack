const prisma = require('../../prisma')

// ── Valid assignment statuses ──────────────────────────────────────────────
const VALID_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']

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

// ── Find Template ──────────────────────────────────────────────────────────
// Finds the best matching template for a topic + difficulty.
// Prefers public templates first, then teacher-owned.
// If exact difficulty not found, finds the closest difficulty level.
const findTemplate = async (topicId, difficulty) => {
  if (!topicId) throw { status: 400, message: 'topicId is required' }

  const parsedTopicId   = parseInt(topicId)
  const parsedDifficulty = difficulty ? parseInt(difficulty) : 1

  // Try exact match first
  let template = await prisma.template.findFirst({
    where: {
      topicId:    parsedTopicId,
      difficulty: parsedDifficulty
    },
    orderBy: [
      { isPublic:   'desc' }, // public first
      { usageCount: 'desc' }  // most used first
    ],
    include: {
      topic:   { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } }
    }
  })

  // Fallback — find closest difficulty if exact not found
  if (!template) {
    template = await prisma.template.findFirst({
      where: { topicId: parsedTopicId },
      orderBy: [
        { difficulty: 'asc' },
        { isPublic:   'desc' },
        { usageCount: 'desc' }
      ],
      include: {
        topic:   { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } }
      }
    })
  }

  if (!template) throw { status: 404, message: 'No template found for this topic' }

  return template
}

// ── Get Templates By Topic ─────────────────────────────────────────────────
// Returns all templates for a topic sorted by difficulty ascending.
// Teacher browses before manually choosing which to assign.
const getTemplatesByTopic = async (topicId) => {
  const parsedTopicId = parseInt(topicId)

  const topic = await prisma.topic.findUnique({ where: { id: parsedTopicId } })
  if (!topic) throw { status: 404, message: 'Topic not found' }

  const templates = await prisma.template.findMany({
    where:   { topicId: parsedTopicId },
    orderBy: [
      { difficulty: 'asc' },
      { isPublic:   'desc' }
    ],
    include: {
      teacher: { select: { id: true, name: true } }
    }
  })

  return {
    topic:     { id: topic.id, name: topic.name },
    total:     templates.length,
    templates
  }
}

// ── Assign Remediation ─────────────────────────────────────────────────────
// Core Template Engine action — triggered by "Assign Remediation" button.
// Flow:
//   1. Verify snapshot exists and student is at-risk
//   2. Find matching template (by topicId + difficulty)
//   3. Write AssignedActivity
//   4. Increment template usageCount
//
// Body shape:
//   {
//     studentId:       number   (required)
//     snapshotId:      number   (required — which snapshot triggered this)
//     topicId:         number   (required — which topic to remediate)
//     difficulty:      number   (optional — defaults to 1)
//     templateId:      number   (optional — teacher manually picks a template)
//     reason:          string   (optional — teacher note)
//     dueDate:         string   (optional — ISO date string)
//   }
const assignRemediation = async (teacherId, {
  studentId,
  snapshotId,
  topicId,
  difficulty,
  templateId,
  reason,
  dueDate
}) => {
  if (!studentId) throw { status: 400, message: 'studentId is required' }
  if (!snapshotId) throw { status: 400, message: 'snapshotId is required' }
  if (!topicId) throw { status: 400, message: 'topicId is required' }

  const parsedStudentId  = parseInt(studentId)
  const parsedSnapshotId = parseInt(snapshotId)
  const parsedTopicId    = parseInt(topicId)

  // Verify snapshot exists and student is at-risk
  const snapshot = await prisma.studentLessonSnapshot.findUnique({
    where: { id: parsedSnapshotId }
  })
  if (!snapshot) throw { status: 404, message: 'Snapshot not found' }
  if (snapshot.studentId !== parsedStudentId)
    throw { status: 403, message: 'Snapshot does not belong to this student' }
  if (!snapshot.isAtRisk)
    throw { status: 400, message: 'Student is not flagged as at-risk in this snapshot' }

  // Verify student exists
  const student = await prisma.student.findUnique({ where: { id: parsedStudentId } })
  if (!student) throw { status: 404, message: 'Student not found' }

  // Verify topic exists
  const topic = await prisma.topic.findUnique({ where: { id: parsedTopicId } })
  if (!topic) throw { status: 404, message: 'Topic not found' }

  // Use manually picked template or find best match
  let resolvedTemplateId = templateId ? parseInt(templateId) : null

  if (!resolvedTemplateId) {
    const template = await findTemplate(parsedTopicId, difficulty ?? 1)
    resolvedTemplateId = template.id
  } else {
    // Verify manually picked template exists
    const template = await prisma.template.findUnique({ where: { id: resolvedTemplateId } })
    if (!template) throw { status: 404, message: 'Template not found' }
  }

  // Write AssignedActivity
  const activity = await prisma.assignedActivity.create({
    data: {
      studentId:       parsedStudentId,
      templateId:      resolvedTemplateId,
      assignedById:    teacherId,
      sourceTopicId:   parsedTopicId,
      sourceSnapshotId: parsedSnapshotId,
      reason:          reason ?? null,
      dueDate:         dueDate ? new Date(dueDate) : null,
      status:          'ASSIGNED'
    },
    include: {
      student:  { select: { id: true, name: true } },
      template: { select: { id: true, title: true, difficulty: true } },
      sourceTopic: { select: { id: true, name: true } }
    }
  })

  // Increment template usageCount
  await prisma.template.update({
    where: { id: resolvedTemplateId },
    data:  { usageCount: { increment: 1 } }
  })

  return activity
}

// ── Get Assignments ────────────────────────────────────────────────────────
// Returns all AssignedActivities for a student.
// Teacher verifies they own a classroom the student belongs to.
const getAssignments = async (teacherId, studentId) => {
  const parsedStudentId = parseInt(studentId)

  const student = await prisma.student.findUnique({
    where: { id: parsedStudentId }
  })
  if (!student) throw { status: 404, message: 'Student not found' }

  // Verify teacher has a classroom with this student's section
  const classRoom = await prisma.classRoom.findFirst({
    where: {
      teacherId,
      sectionId: student.sectionId
    }
  })
  if (!classRoom) throw { status: 403, message: 'Access denied' }

  const activities = await prisma.assignedActivity.findMany({
    where:   { studentId: parsedStudentId },
    include: {
      template:    { select: { id: true, title: true, difficulty: true, interactionType: true } },
      sourceTopic: { select: { id: true, name: true } },
      assignedBy:  { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return {
    studentId: parsedStudentId,
    name:      student.name,
    total:     activities.length,
    activities
  }
}

// ── Update Assignment Status ───────────────────────────────────────────────
// Both teachers and students can update status.
// Teacher: ASSIGNED → ARCHIVED
// Student: ASSIGNED → IN_PROGRESS → COMPLETED
// Guard: only the assigned student or assigning teacher can update.
const updateAssignmentStatus = async (userId, assignmentId, status) => {
  if (!status) throw { status: 400, message: 'status is required' }
  if (!VALID_STATUSES.includes(status))
    throw { status: 400, message: `status must be one of: ${VALID_STATUSES.join(', ')}` }

  const parsedAssignmentId = parseInt(assignmentId)

  const activity = await prisma.assignedActivity.findUnique({
    where: { id: parsedAssignmentId }
  })
  if (!activity) throw { status: 404, message: 'Assignment not found' }

  // Only the assigned student or assigning teacher can update
  const isStudent = activity.studentId === userId
  const isTeacher = activity.assignedById === userId
  if (!isStudent && !isTeacher)
    throw { status: 403, message: 'Access denied' }

  const data = { status }
  if (status === 'COMPLETED') data.completedAt = new Date()

  return prisma.assignedActivity.update({
    where: { id: parsedAssignmentId },
    data,
    include: {
      template:    { select: { id: true, title: true } },
      sourceTopic: { select: { id: true, name: true } }
    }
  })
}

// ── Get Classroom Assignments ──────────────────────────────────────────────
// Returns all AssignedActivities across a classroom's section.
// Grouped by status for the teacher overview.
const getClassroomAssignments = async (teacherId, classRoomId) => {
  const parsedClassRoomId = parseInt(classRoomId)

  const classRoom = await verifyClassRoomOwnership(teacherId, parsedClassRoomId)

  const activities = await prisma.assignedActivity.findMany({
    where: {
      student: { sectionId: classRoom.sectionId }
    },
    include: {
      student:     { select: { id: true, name: true } },
      template:    { select: { id: true, title: true, difficulty: true } },
      sourceTopic: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Group by status
  const grouped = {
    ASSIGNED:    activities.filter(a => a.status === 'ASSIGNED'),
    IN_PROGRESS: activities.filter(a => a.status === 'IN_PROGRESS'),
    COMPLETED:   activities.filter(a => a.status === 'COMPLETED'),
    ARCHIVED:    activities.filter(a => a.status === 'ARCHIVED')
  }

  return {
    total: activities.length,
    grouped,
    activities
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