const prisma = require('../../prisma')

const getNextStep = async (sessionId) => {
  const last = await prisma.questionAttemptEvent.findFirst({
    where: { sessionId },
    orderBy: { stepNumber: 'desc' }
  })
  return last ? last.stepNumber + 1 : 1
}

const verifySession = async (studentId, sessionToken, { allowFinished = false } = {}) => {
  const session = await prisma.questionAttemptSession.findUnique({
    where: { sessionToken },
    include: {
      question: {
        include: { lesson: true }
      }
    }
  })
  if (!session) throw { status: 404, message: 'Session not found' }
  if (session.studentId !== studentId) throw { status: 403, message: 'Access denied' }
  if (!allowFinished && session.isSubmitted)
    throw { status: 409, message: 'Session already finished' }
  return session
}

// ── Answer Validator ───────────────────────────────────────────────────────
// Validates submitted answer against Question.contentJson server-side.
// All interaction types read from semantic data only — never canvas elements.
//
// DRAG_MATCH:       answer = { [target.id]: item.id }
// MULTIPLE_CHOICE:  answer = item.id (string)
// FILL_STEP:        answer = string
// NUMBER_LINE:      answer = number
const validateAnswer = (question, answer) => {
  const config = question.contentJson

  switch (question.templateType) {
    case 'DRAG_MATCH': {
      if (!answer || typeof answer !== 'object') return false
      const targets = config.targets ?? []
      if (targets.length === 0) return false
      // Every target must have the correct item placed
      return targets.every(target => answer[target.id] === target.accepts)
    }

    case 'MULTIPLE_CHOICE': {
      if (typeof answer !== 'string') return false
      return answer === config.correctId
    }

    case 'FILL_STEP': {
      if (typeof answer !== 'string') return false
      return answer.trim().toLowerCase() === (config.answer ?? '').trim().toLowerCase()
    }

    case 'NUMBER_LINE': {
      return Number(answer) === config.correctValue
    }

    default:
      return false
  }
}

const startQuestion = async (studentId, questionId) => {
  const parsedQuestionId = parseInt(questionId)
  const question = await prisma.question.findUnique({
    where: { id: parsedQuestionId },
    include: { lesson: true }
  })
  if (!question) throw { status: 404, message: 'Question not found' }

  const existing = await prisma.questionAttemptSession.findFirst({
    where: { questionId: parsedQuestionId, studentId, isSubmitted: false }
  })
  if (existing) return { resumed: true, session: existing }

  const session = await prisma.questionAttemptSession.create({
    data: { questionId: parsedQuestionId, studentId }
  })
  await prisma.questionAttemptEvent.create({
    data: {
      sessionId:  session.id,
      eventType:  'SESSION_STARTED',
      stepNumber: 1,
      payload:    { questionId: parsedQuestionId }
    }
  })
  return { resumed: false, session }
}

const submitAnswer = async (studentId, sessionToken, { answer }) => {
  const session = await verifySession(studentId, sessionToken)
  const correct = validateAnswer(session.question, answer)
  const step    = await getNextStep(session.id)

  await prisma.questionAttemptEvent.create({
    data: {
      sessionId:  session.id,
      eventType:  'ATTEMPT_SUBMITTED',
      stepNumber: step,
      payload:    { answer, correct }
    }
  })
  await prisma.questionAttemptSession.update({
    where: { id: session.id },
    data:  { attempts: { increment: 1 } }
  })

  if (correct) {
    await prisma.questionAttemptEvent.create({
      data: {
        sessionId:  session.id,
        eventType:  'SESSION_FINISHED',
        stepNumber: step + 1,
        payload:    { correct: true }
      }
    })
    const finalized = await prisma.questionAttemptSession.update({
      where: { id: session.id },
      data:  { isSubmitted: true, correct: true, submittedAt: new Date() }
    })
    await checkLessonCompletion(studentId, session.question.lessonId)
    return { message: 'Correct — session finished', correct: true, finished: true, session: finalized }
  }

  const updated = await prisma.questionAttemptSession.findUnique({ where: { id: session.id } })
  return { message: 'Wrong answer — try again', correct: false, finished: false, attempts: updated.attempts, session: updated }
}

const useHint = async (studentId, sessionToken, hintIndex) => {
  if (hintIndex === undefined || hintIndex === null)
    throw { status: 400, message: 'hintIndex is required' }
  const session = await verifySession(studentId, sessionToken)
  const step    = await getNextStep(session.id)
  await prisma.questionAttemptEvent.create({
    data: {
      sessionId:  session.id,
      eventType:  'HINT_OPENED',
      stepNumber: step,
      payload:    { hintIndex: parseInt(hintIndex) }
    }
  })
  const updated = await prisma.questionAttemptSession.update({
    where: { id: session.id },
    data:  { hintsUsed: { increment: 1 } }
  })
  return { message: 'Hint recorded', hintsUsed: updated.hintsUsed }
}

const finishSession = async (studentId, sessionToken) => {
  const session = await verifySession(studentId, sessionToken)
  const step    = await getNextStep(session.id)
  await prisma.questionAttemptEvent.create({
    data: {
      sessionId:  session.id,
      eventType:  'SESSION_FINISHED',
      stepNumber: step,
      payload:    { correct: false, givenUp: true }
    }
  })
  const finalized = await prisma.questionAttemptSession.update({
    where: { id: session.id },
    data:  { isSubmitted: true, correct: false, submittedAt: new Date() }
  })
  await checkLessonCompletion(studentId, session.question.lessonId)
  return { message: 'Session finished', correct: false, finished: true, session: finalized }
}

const getSession = async (studentId, sessionToken) => {
  const session = await verifySession(studentId, sessionToken, { allowFinished: true })
  const events  = await prisma.questionAttemptEvent.findMany({
    where:   { sessionId: session.id },
    orderBy: { stepNumber: 'asc' }
  })
  return { ...session, events }
}

const checkLessonCompletion = async (studentId, lessonId) => {
  const totalQuestions = await prisma.question.count({ where: { lessonId } })
  const finishedSessions = await prisma.questionAttemptSession.count({
    where: { studentId, isSubmitted: true, question: { lessonId } }
  })
  if (finishedSessions < totalQuestions) return
  const existingSnapshot = await prisma.studentLessonSnapshot.findFirst({
    where: { studentId, lessonId }
  })
  if (existingSnapshot) return
  await computeAndSaveSnapshot(studentId, lessonId, totalQuestions)
}

const computeAndSaveSnapshot = async (studentId, lessonId, totalQuestions) => {
  const sessions = await prisma.questionAttemptSession.findMany({
    where: { studentId, isSubmitted: true, question: { lessonId } },
    select: { correct: true, attempts: true, hintsUsed: true }
  })
  const correctCount = sessions.filter(s => s.correct).length
  const mps          = (correctCount / totalQuestions) * 100
  const avgAttempts  = sessions.reduce((sum, s) => sum + s.attempts, 0) / totalQuestions
  const avgHintsUsed = sessions.reduce((sum, s) => sum + s.hintsUsed, 0) / totalQuestions
  await prisma.studentLessonSnapshot.create({
    data: { studentId, lessonId, totalQuestions, correctCount, mps, avgAttempts, avgHintsUsed, isAtRisk: mps < 75 }
  })
}

module.exports = { startQuestion, submitAnswer, useHint, finishSession, getSession }