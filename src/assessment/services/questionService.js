const prisma = require('../../prisma')

// ── Ownership guard ────────────────────────────────────────────────────────
// Verifies the lesson belongs to the requesting teacher.
// Used before any write operation on a question.
const verifyLessonOwnership = async (teacherId, lessonId) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { classRoom: true }
  })

  if (!lesson) throw { status: 404, message: 'Lesson not found' }
  if (lesson.classRoom.teacherId !== teacherId)
    throw { status: 403, message: 'Access denied' }

  return lesson
}

// ── Create ─────────────────────────────────────────────────────────────────
// Appends a new question to the end of the lesson by default.
// order is auto-assigned as (current max order + 1) unless explicitly provided.
const createQuestion = async (teacherId, { lessonId, topicId, templateType, contentJson, order }) => {
  const parsedLessonId = parseInt(lessonId)
  const parsedTopicId  = parseInt(topicId)

  await verifyLessonOwnership(teacherId, parsedLessonId)

  // Verify topic exists
  const topic = await prisma.topic.findUnique({ where: { id: parsedTopicId } })
  if (!topic) throw { status: 404, message: 'Topic not found' }

  // Auto-assign order if not provided
  let assignedOrder = order ? parseInt(order) : null
  if (!assignedOrder) {
    const last = await prisma.question.findFirst({
      where: { lessonId: parsedLessonId },
      orderBy: { order: 'desc' }
    })
    assignedOrder = last ? last.order + 1 : 1
  }

  // Guard: order must not already be taken
  const conflict = await prisma.question.findUnique({
    where: { lessonId_order: { lessonId: parsedLessonId, order: assignedOrder } }
  })
  if (conflict) throw { status: 409, message: `Order ${assignedOrder} is already taken in this lesson` }

  return prisma.question.create({
    data: {
      lessonId:     parsedLessonId,
      topicId:      parsedTopicId,
      templateType,
      contentJson,
      order:        assignedOrder
    },
    include: {
      topic: { select: { id: true, name: true } }
    }
  })
}

// ── Read all ───────────────────────────────────────────────────────────────
// Returns all questions for a lesson, ordered by sequence position.
// contentJson is included — student runner needs it to render questions.
const getQuestions = async (lessonId) => {
  const parsedLessonId = parseInt(lessonId)

  const lesson = await prisma.lesson.findUnique({ where: { id: parsedLessonId } })
  if (!lesson) throw { status: 404, message: 'Lesson not found' }

  return prisma.question.findMany({
    where: { lessonId: parsedLessonId },
    orderBy: { order: 'asc' },
    include: {
      topic: { select: { id: true, name: true } }
    }
  })
}

// ── Read one ───────────────────────────────────────────────────────────────
const getQuestion = async (id) => {
  const question = await prisma.question.findUnique({
    where: { id: parseInt(id) },
    include: {
      topic:  { select: { id: true, name: true } },
      lesson: { select: { id: true, title: true } }
    }
  })

  if (!question) throw { status: 404, message: 'Question not found' }

  return question
}

// ── Update ─────────────────────────────────────────────────────────────────
// Only contentJson, templateType, topicId, and order are editable.
// If order changes, guard against collision first.
const updateQuestion = async (teacherId, id, { templateType, topicId, contentJson, order }) => {
  const parsedId = parseInt(id)

  const question = await prisma.question.findUnique({
    where: { id: parsedId },
    include: { lesson: { include: { classRoom: true } } }
  })

  if (!question) throw { status: 404, message: 'Question not found' }
  if (question.lesson.classRoom.teacherId !== teacherId)
    throw { status: 403, message: 'Access denied' }

  // If order is changing, check for collision
  if (order && parseInt(order) !== question.order) {
    const conflict = await prisma.question.findUnique({
      where: {
        lessonId_order: {
          lessonId: question.lessonId,
          order: parseInt(order)
        }
      }
    })
    if (conflict) throw { status: 409, message: `Order ${order} is already taken in this lesson` }
  }

  // Verify new topic exists if changing
  if (topicId) {
    const topic = await prisma.topic.findUnique({ where: { id: parseInt(topicId) } })
    if (!topic) throw { status: 404, message: 'Topic not found' }
  }

  return prisma.question.update({
    where: { id: parsedId },
    data: {
      ...(templateType && { templateType }),
      ...(topicId      && { topicId: parseInt(topicId) }),
      ...(contentJson  && { contentJson }),
      ...(order        && { order: parseInt(order) })
    },
    include: {
      topic: { select: { id: true, name: true } }
    }
  })
}

// ── Delete ─────────────────────────────────────────────────────────────────
// Cascade in schema handles QuestionAttemptSession + QuestionAttemptEvent.
const deleteQuestion = async (teacherId, id) => {
  const parsedId = parseInt(id)

  const question = await prisma.question.findUnique({
    where: { id: parsedId },
    include: { lesson: { include: { classRoom: true } } }
  })

  if (!question) throw { status: 404, message: 'Question not found' }
  if (question.lesson.classRoom.teacherId !== teacherId)
    throw { status: 403, message: 'Access denied' }

  return prisma.question.delete({ where: { id: parsedId } })
}

// ── Reorder ────────────────────────────────────────────────────────────────
// Accepts an array of { id, order } pairs and updates all in a transaction.
// Used when teacher drags questions to resequence them.
// Example body: { order: [{ id: 3, order: 1 }, { id: 1, order: 2 }, { id: 2, order: 3 }] }
const reorderQuestions = async (teacherId, lessonId, orderArray) => {
  const parsedLessonId = parseInt(lessonId)

  await verifyLessonOwnership(teacherId, parsedLessonId)

  if (!Array.isArray(orderArray) || orderArray.length === 0)
    throw { status: 400, message: 'order must be a non-empty array of { id, order }' }

  // Validate all IDs belong to this lesson
  const questionIds = orderArray.map(q => parseInt(q.id))
  const existing = await prisma.question.findMany({
    where: { lessonId: parsedLessonId, id: { in: questionIds } },
    select: { id: true }
  })

  if (existing.length !== questionIds.length)
    throw { status: 400, message: 'One or more question IDs do not belong to this lesson' }

  // Run all updates in a single transaction
  await prisma.$transaction(
    orderArray.map(({ id, order }) =>
      prisma.question.update({
        where: { id: parseInt(id) },
        data:  { order: parseInt(order) }
      })
    )
  )
}

module.exports = {
  createQuestion,
  getQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions
}