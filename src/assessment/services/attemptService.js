const prisma = require('../../prisma')

// ── Helpers ────────────────────────────────────────────────────────────────

// Returns the next stepNumber for a session.
// stepNumber is a sequence counter — each event in a session gets the next number.
const getNextStep = async (sessionId) => {
  const last = await prisma.questionAttemptEvent.findFirst({
    where: { sessionId },
    orderBy: { stepNumber: 'desc' }
  })
  return last ? last.stepNumber + 1 : 1
}

// Verifies the session belongs to the requesting student and is not already finished.
const verifySession = async (studentId, sessionToken, { allowFinished = false } = {}) => {
  const session = await prisma.questionAttemptSession.findUnique({
    where: { sessionToken },
    include: {
      question: {
        include: {
          lesson: true
        }
      }
    }
  })

  if (!session) throw { status: 404, message: 'Session not found' }
  if (session.studentId !== studentId) throw { status: 403, message: 'Access denied' }
  if (!allowFinished && session.isSubmitted)
    throw { status: 409, message: 'Session already finished' }

  return session
}

// ── Start Question ─────────────────────────────────────────────────────────
// Called when a student opens a question.
// Checks if a session already exists — resumes it instead of creating a duplicate.
// Creates QuestionAttemptSession + SESSION_STARTED event.
const startQuestion = async (studentId, questionId) => {
  const parsedQuestionId = parseInt(questionId)

  // Verify question exists
  const question = await prisma.question.findUnique({
    where: { id: parsedQuestionId },
    include: { lesson: true }
  })
  if (!question) throw { status: 404, message: 'Question not found' }

  // Resume existing unfinished session if one exists
  const existing = await prisma.questionAttemptSession.findFirst({
    where: {
      questionId: parsedQuestionId,
      studentId,
      isSubmitted: false
    }
  })
  if (existing) return { resumed: true, session: existing }

  // Create new session
  const session = await prisma.questionAttemptSession.create({
    data: {
      questionId: parsedQuestionId,
      studentId
    }
  })

  // Fire SESSION_STARTED event
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

// ── Submit Answer ──────────────────────────────────────────────────────────
// Called when a student submits an answer.
// Always fires ATTEMPT_SUBMITTED event.
// If correct → also fires SESSION_FINISHED and finalizes the session.
// After finalization → checks if lesson is complete → triggers snapshot if so.
const submitAnswer = async (studentId, sessionToken, { answer, correct }) => {
  if (typeof correct !== 'boolean')
    throw { status: 400, message: 'correct must be a boolean' }

  const session = await verifySession(studentId, sessionToken)
  const step    = await getNextStep(session.id)

  // Fire ATTEMPT_SUBMITTED event
  await prisma.questionAttemptEvent.create({
    data: {
      sessionId:  session.id,
      eventType:  'ATTEMPT_SUBMITTED',
      stepNumber: step,
      payload:    { answer, correct }
    }
  })

  // Increment attempts
  await prisma.questionAttemptSession.update({
    where: { id: session.id },
    data:  { attempts: { increment: 1 } }
  })

  // If correct → finalize session
  if (correct) {
    const finalStep = step + 1

    await prisma.questionAttemptEvent.create({
      data: {
        sessionId:  session.id,
        eventType:  'SESSION_FINISHED',
        stepNumber: finalStep,
        payload:    { correct: true }
      }
    })

    const finalized = await prisma.questionAttemptSession.update({
      where: { id: session.id },
      data: {
        isSubmitted:  true,
        correct:      true,
        submittedAt:  new Date()
      }
    })

    // Check if lesson is complete → trigger snapshot
    await checkLessonCompletion(studentId, session.question.lessonId)

    return {
      message:   'Correct — session finished',
      correct:   true,
      finished:  true,
      session:   finalized
    }
  }

  // Wrong answer — session stays open
  const updated = await prisma.questionAttemptSession.findUnique({
    where: { id: session.id }
  })

  return {
    message:  'Wrong answer — try again',
    correct:  false,
    finished: false,
    attempts: updated.attempts,
    session:  updated
  }
}

// ── Use Hint ───────────────────────────────────────────────────────────────
// Called when a student opens a hint.
// Fires HINT_OPENED event and increments hintsUsed on the session.
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

  return {
    message:   'Hint recorded',
    hintsUsed: updated.hintsUsed
  }
}

// ── Finish Session ─────────────────────────────────────────────────────────
// Called when a student gives up or exits without getting the answer correct.
// Fires SESSION_FINISHED with correct = false and finalizes the session.
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
    data: {
      isSubmitted: true,
      correct:     false,
      submittedAt: new Date()
    }
  })

  // Check if lesson is complete → trigger snapshot
  await checkLessonCompletion(studentId, session.question.lessonId)

  return {
    message:  'Session finished',
    correct:  false,
    finished: true,
    session:  finalized
  }
}

// ── Get Session ────────────────────────────────────────────────────────────
// Returns current session state including all events.
// Used by frontend to resume an interrupted session.
const getSession = async (studentId, sessionToken) => {
  const session = await verifySession(studentId, sessionToken, { allowFinished: true })

  const events = await prisma.questionAttemptEvent.findMany({
    where:   { sessionId: session.id },
    orderBy: { stepNumber: 'asc' }
  })

  return { ...session, events }
}

// ── Lesson Completion Check ────────────────────────────────────────────────
// Called after every SESSION_FINISHED event.
// Checks if the student has finished ALL questions in the lesson.
// If yes → triggers StudentLessonSnapshot (MPS compute).
// This is the bridge between Phase 2 (attempt pipeline) and Phase 3 (snapshots).
const checkLessonCompletion = async (studentId, lessonId) => {
  // Get total questions in lesson
  const totalQuestions = await prisma.question.count({
    where: { lessonId }
  })

  // Get all finished sessions for this student in this lesson
  const finishedSessions = await prisma.questionAttemptSession.count({
    where: {
      studentId,
      isSubmitted: true,
      question: { lessonId }
    }
  })

  // Not done yet
  if (finishedSessions < totalQuestions) return

  // All questions finished — check if snapshot already exists
  const existingSnapshot = await prisma.studentLessonSnapshot.findFirst({
    where: { studentId, lessonId }
  })
  if (existingSnapshot) return // snapshot already taken, skip

  // Compute MPS from sessions
  await computeAndSaveSnapshot(studentId, lessonId, totalQuestions)
}

// ── Snapshot Compute ───────────────────────────────────────────────────────
// Computes MPS and saves StudentLessonSnapshot.
// Called automatically when a student finishes all questions in a lesson.
// MPS = (correctCount / totalQuestions) * 100
// isAtRisk = mps < 75 (DepEd mastery threshold)
const computeAndSaveSnapshot = async (studentId, lessonId, totalQuestions) => {
  const sessions = await prisma.questionAttemptSession.findMany({
    where: {
      studentId,
      isSubmitted: true,
      question: { lessonId }
    },
    select: {
      correct:   true,
      attempts:  true,
      hintsUsed: true
    }
  })

  const correctCount  = sessions.filter(s => s.correct).length
  const mps           = (correctCount / totalQuestions) * 100
  const avgAttempts   = sessions.reduce((sum, s) => sum + s.attempts, 0) / totalQuestions
  const avgHintsUsed  = sessions.reduce((sum, s) => sum + s.hintsUsed, 0) / totalQuestions
  const isAtRisk      = mps < 75

  await prisma.studentLessonSnapshot.create({
    data: {
      studentId,
      lessonId,
      totalQuestions,
      correctCount,
      mps,
      avgAttempts,
      avgHintsUsed,
      isAtRisk
    }
  })
}

module.exports = {
  startQuestion,
  submitAnswer,
  useHint,
  finishSession,
  getSession
}