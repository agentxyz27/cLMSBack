/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              CLMS — Simulation Endpoint                                ║
 * ║              POST /simulate/session                                     ║
 * ║              POST /simulate/classroom                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Mount in your Express app:
 *   const simulateRouter = require('./routes/simulate')
 *   app.use('/simulate', simulateRouter)
 *
 * ── Endpoints ─────────────────────────────────────────────────────────────
 *
 * POST /simulate/session
 *   Simulates one student completing one lesson.
 *   Body: { studentId, lessonId, profile? }
 *   profile: "at_risk" | "average" | "advanced" | "random" (default: random)
 *
 * POST /simulate/classroom
 *   Simulates ALL students in a classroom completing ALL lessons.
 *   Use once to bulk-populate analytics data.
 *   Body: { classRoomId, profileDistribution? }
 *   profileDistribution: { at_risk: 0.3, average: 0.5, advanced: 0.2 }
 *
 * ── What /simulate/session does internally ────────────────────────────────
 *   For each question in the lesson:
 *     1. Creates QuestionAttemptSession
 *     2. Writes SESSION_STARTED event
 *     3. Loops attempts:
 *          → maybe HINT_OPENED
 *          → maybe ANSWER_CHANGED
 *          → ATTEMPT_SUBMITTED (correct or not)
 *     4. Writes SESSION_FINISHED event
 *     5. Finalizes QuestionAttemptSession (attempts, hintsUsed, correct)
 *   After all questions:
 *     6. Upserts Progress (completed = true, xpEarned)
 *     7. Increments Student.xp
 *     8. Creates StudentLessonSnapshot (mps, isAtRisk, avgAttempts)
 *
 * ── Behavior Profiles ─────────────────────────────────────────────────────
 *   at_risk  → 35–60% correct, 3–6 attempts, frequent hints
 *   average  → 60–80% correct, 1–3 attempts, occasional hints
 *   advanced → 85–100% correct, 1–2 attempts, rare hints
 *   random   → randomly picks one of the above each call
 */

require('dotenv').config()
const express          = require('express')
const { PrismaPg }     = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma  = new PrismaClient({ adapter })
const router  = express.Router()

// ── Profile Definitions ────────────────────────────────────────────────────

const PROFILES = {
  at_risk: {
    correctnessProbability: () => 0.35 + Math.random() * 0.25,  // 35–60%
    maxAttempts:            () => 3 + Math.floor(Math.random() * 4),  // 3–6
    hintProbability:        0.75,
    maxHintsPerQuestion:    3,
    xpMultiplier:           0.5,
  },
  average: {
    correctnessProbability: () => 0.60 + Math.random() * 0.20,  // 60–80%
    maxAttempts:            () => 1 + Math.floor(Math.random() * 3),  // 1–3
    hintProbability:        0.40,
    maxHintsPerQuestion:    2,
    xpMultiplier:           1.0,
  },
  advanced: {
    correctnessProbability: () => 0.85 + Math.random() * 0.15,  // 85–100%
    maxAttempts:            () => 1 + Math.floor(Math.random() * 2),  // 1–2
    hintProbability:        0.15,
    maxHintsPerQuestion:    1,
    xpMultiplier:           1.5,
  },
}

const PROFILE_NAMES = Object.keys(PROFILES)

// ── Core Simulation Logic ──────────────────────────────────────────────────

/**
 * Simulate one question attempt.
 * Writes QuestionAttemptSession + all QuestionAttemptEvent rows.
 * Returns { correct, attempts, hintsUsed }
 */
async function simulateQuestion(studentId, questionId, profile) {
  const correctnessProbability = profile.correctnessProbability()
  const maxAttempts            = profile.maxAttempts()

  const session = await prisma.questionAttemptSession.create({
    data: { studentId, questionId },
  })

  let stepNumber = 1
  let hintsUsed  = 0
  let attempts   = 0
  let correct    = false

  // SESSION_STARTED
  await prisma.questionAttemptEvent.create({
    data: {
      sessionId:  session.id,
      eventType:  'SESSION_STARTED',
      stepNumber: stepNumber++,
      payload:    { timestamp: new Date().toISOString() },
    },
  })

  // Attempt loop
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Maybe open a hint
    if (Math.random() < profile.hintProbability && hintsUsed < profile.maxHintsPerQuestion) {
      await prisma.questionAttemptEvent.create({
        data: {
          sessionId:  session.id,
          eventType:  'HINT_OPENED',
          stepNumber: stepNumber++,
          payload:    { hintIndex: hintsUsed },
        },
      })
      hintsUsed++
    }

    // Hints + repeated attempts slightly improve correctness probability
    const bonus       = hintsUsed * 0.05 + (attempt - 1) * 0.03
    const thisCorrect = Math.random() < Math.min(correctnessProbability + bonus, 0.98)
    attempts++

    // Maybe change answer before submitting
    if (Math.random() < 0.3) {
      await prisma.questionAttemptEvent.create({
        data: {
          sessionId:  session.id,
          eventType:  'ANSWER_CHANGED',
          stepNumber: stepNumber++,
          payload:    { value: `draft_${attempt}` },
        },
      })
    }

    // ATTEMPT_SUBMITTED
    await prisma.questionAttemptEvent.create({
      data: {
        sessionId:  session.id,
        eventType:  'ATTEMPT_SUBMITTED',
        stepNumber: stepNumber++,
        payload:    { correct: thisCorrect, value: `answer_${attempt}` },
      },
    })

    if (thisCorrect) {
      correct = true
      break
    }
  }

  // SESSION_FINISHED
  const now = new Date()
  await prisma.questionAttemptEvent.create({
    data: {
      sessionId:  session.id,
      eventType:  'SESSION_FINISHED',
      stepNumber: stepNumber++,
      payload:    { correct },
    },
  })

  // Finalize session
  await prisma.questionAttemptSession.update({
    where: { id: session.id },
    data: {
      attempts,
      hintsUsed,
      isSubmitted: true,
      correct,
      submittedAt: now,
    },
  })

  return { correct, attempts, hintsUsed }
}

/**
 * Generate StudentLessonSnapshot from an array of question results.
 * Called after all questions in a lesson are completed.
 */
async function generateStudentSnapshot(studentId, lessonId, results) {
  const totalQuestions = results.length
  const correctCount   = results.filter((r) => r.correct).length
  const mps            = (correctCount / totalQuestions) * 100
  const avgAttempts    = results.reduce((s, r) => s + r.attempts, 0)  / totalQuestions
  const avgHintsUsed   = results.reduce((s, r) => s + r.hintsUsed, 0) / totalQuestions
  const isAtRisk       = mps < 75

  return prisma.studentLessonSnapshot.create({
    data: {
      studentId,
      lessonId,
      totalQuestions,
      correctCount,
      mps:          parseFloat(mps.toFixed(2)),
      avgAttempts:  parseFloat(avgAttempts.toFixed(2)),
      avgHintsUsed: parseFloat(avgHintsUsed.toFixed(2)),
      isAtRisk,
    },
  })
}

// ── POST /simulate/session ─────────────────────────────────────────────────

router.post('/session', async (req, res) => {
  const { studentId, lessonId, profile: profileName = 'random' } = req.body

  if (!studentId || !lessonId) {
    return res.status(400).json({ error: 'studentId and lessonId are required.' })
  }

  const resolvedProfileName =
    profileName === 'random'
      ? PROFILE_NAMES[Math.floor(Math.random() * PROFILE_NAMES.length)]
      : profileName

  const profile = PROFILES[resolvedProfileName]
  if (!profile) {
    return res.status(400).json({
      error: `Unknown profile "${profileName}". Valid: at_risk | average | advanced | random`,
    })
  }

  const [student, lesson] = await Promise.all([
    prisma.student.findUnique({ where: { id: Number(studentId) } }),
    prisma.lesson.findUnique({
      where:   { id: Number(lessonId) },
      include: { questions: { orderBy: { order: 'asc' } } },
    }),
  ])

  if (!student) return res.status(404).json({ error: `Student ${studentId} not found.` })
  if (!lesson)  return res.status(404).json({ error: `Lesson ${lessonId} not found.` })
  if (!lesson.questions.length) {
    return res.status(422).json({ error: `Lesson ${lessonId} has no questions. Run seed.simulate.js first.` })
  }

  // Guard: already fully completed
  const existingProgress = await prisma.progress.findUnique({
    where: { studentId_lessonId: { studentId: Number(studentId), lessonId: Number(lessonId) } },
  })
  if (existingProgress?.completed) {
    return res.status(409).json({
      error: `Student ${studentId} already completed lesson ${lessonId}.`,
    })
  }

  // Skip questions already attempted
  const alreadyAttempted = await prisma.questionAttemptSession.findMany({
    where: {
      studentId:   Number(studentId),
      questionId:  { in: lesson.questions.map((q) => q.id) },
      isSubmitted: true,
    },
    select: { questionId: true },
  })
  const attemptedIds       = new Set(alreadyAttempted.map((a) => a.questionId))
  const questionsToAttempt = lesson.questions.filter((q) => !attemptedIds.has(q.id))

  if (!questionsToAttempt.length) {
    return res.status(409).json({
      error: `Student ${studentId} already attempted all questions in lesson ${lessonId}.`,
    })
  }

  try {
    const newResults = []
    for (const question of questionsToAttempt) {
      const result = await simulateQuestion(Number(studentId), question.id, profile)
      newResults.push(result)
    }

    const xpEarned = Math.round(50 * profile.xpMultiplier)
    const score    = newResults.filter((r) => r.correct).length * 10

    const progress = await prisma.progress.upsert({
      where:  { studentId_lessonId: { studentId: Number(studentId), lessonId: Number(lessonId) } },
      update: { completed: true, score, xpEarned },
      create: { studentId: Number(studentId), lessonId: Number(lessonId), completed: true, score, xpEarned },
    })

    // Increment XP + recalculate level
    const updatedStudent = await prisma.student.update({
      where: { id: Number(studentId) },
      data:  { xp: { increment: xpEarned } },
    })
    const newLevel = Math.floor(updatedStudent.xp / 200) + 1
    if (newLevel !== updatedStudent.level) {
      await prisma.student.update({ where: { id: Number(studentId) }, data: { level: newLevel } })
    }

    // Generate snapshot only when ALL questions in the lesson are complete
    const allCompletedCount = await prisma.questionAttemptSession.count({
      where: {
        studentId:   Number(studentId),
        questionId:  { in: lesson.questions.map((q) => q.id) },
        isSubmitted: true,
      },
    })

    let snapshot = null
    if (allCompletedCount === lesson.questions.length) {
      const allSessions = await prisma.questionAttemptSession.findMany({
        where: {
          studentId:   Number(studentId),
          questionId:  { in: lesson.questions.map((q) => q.id) },
          isSubmitted: true,
        },
      })
      snapshot = await generateStudentSnapshot(
        Number(studentId),
        Number(lessonId),
        allSessions.map((s) => ({ correct: s.correct, attempts: s.attempts, hintsUsed: s.hintsUsed }))
      )
    }

    const totalQ   = questionsToAttempt.length
    const correctN = newResults.filter((r) => r.correct).length

    return res.status(200).json({
      success: true,
      simulation: {
        studentId:   Number(studentId),
        studentName: student.name,
        lessonId:    Number(lessonId),
        lessonTitle: lesson.title,
        profile:     resolvedProfileName,
      },
      results: {
        totalQuestions: totalQ,
        correctCount:   correctN,
        mps:            parseFloat(((correctN / totalQ) * 100).toFixed(2)),
        avgAttempts:    parseFloat((newResults.reduce((s, r) => s + r.attempts, 0)  / totalQ).toFixed(2)),
        avgHintsUsed:   parseFloat((newResults.reduce((s, r) => s + r.hintsUsed, 0) / totalQ).toFixed(2)),
        xpEarned,
      },
      snapshot: snapshot
        ? { id: snapshot.id, mps: snapshot.mps, isAtRisk: snapshot.isAtRisk, snapshotAt: snapshot.snapshotAt }
        : null,
      progress: { id: progress.id, completed: progress.completed, score: progress.score },
    })
  } catch (err) {
    console.error('[simulate/session]', err)
    return res.status(500).json({ error: 'Simulation failed.', detail: err.message })
  }
})

// ── POST /simulate/classroom ───────────────────────────────────────────────

router.post('/classroom', async (req, res) => {
  const { classRoomId, profileDistribution } = req.body

  if (!classRoomId) {
    return res.status(400).json({ error: 'classRoomId is required.' })
  }

  const dist = profileDistribution || { at_risk: 0.3, average: 0.5, advanced: 0.2 }

  const classroom = await prisma.classRoom.findUnique({
    where:   { id: Number(classRoomId) },
    include: {
      section: { include: { students: true } },
      lessons: { include: { questions: true } },
    },
  })

  if (!classroom) return res.status(404).json({ error: `ClassRoom ${classRoomId} not found.` })

  const students = classroom.section.students
  const lessons  = classroom.lessons.filter((l) => l.questions.length > 0)

  if (!students.length) return res.status(422).json({ error: 'No students in this section.' })
  if (!lessons.length)  return res.status(422).json({ error: 'No lessons with questions found.' })

  function assignProfile(index, total) {
    const atRiskCut  = Math.round(total * dist.at_risk)
    const averageCut = atRiskCut + Math.round(total * dist.average)
    if (index < atRiskCut)  return 'at_risk'
    if (index < averageCut) return 'average'
    return 'advanced'
  }

  let successCount = 0
  let skippedCount = 0
  let errorCount   = 0

  for (const lesson of lessons) {
    for (let i = 0; i < students.length; i++) {
      const student  = students[i]
      const profName = assignProfile(i, students.length)
      const profile  = PROFILES[profName]

      try {
        const existing = await prisma.progress.findUnique({
          where: { studentId_lessonId: { studentId: student.id, lessonId: lesson.id } },
        })
        if (existing?.completed) { skippedCount++; continue }

        const questionResults = []
        for (const question of lesson.questions) {
          const done = await prisma.questionAttemptSession.findFirst({
            where: { studentId: student.id, questionId: question.id, isSubmitted: true },
          })
          if (done) continue
          const result = await simulateQuestion(student.id, question.id, profile)
          questionResults.push(result)
        }

        if (questionResults.length) {
          const xpEarned = Math.round(50 * profile.xpMultiplier)
          await prisma.progress.upsert({
            where:  { studentId_lessonId: { studentId: student.id, lessonId: lesson.id } },
            update: { completed: true, score: questionResults.filter((r) => r.correct).length * 10, xpEarned },
            create: { studentId: student.id, lessonId: lesson.id, completed: true, score: questionResults.filter((r) => r.correct).length * 10, xpEarned },
          })
          await prisma.student.update({ where: { id: student.id }, data: { xp: { increment: xpEarned } } })
          await generateStudentSnapshot(student.id, lesson.id, questionResults)
          successCount++
        }
      } catch (err) {
        console.error(`[simulate/classroom] student ${student.id} lesson ${lesson.id}:`, err.message)
        errorCount++
      }
    }
  }

  return res.json({
    success:       true,
    classRoomId:   Number(classRoomId),
    studentsCount: students.length,
    lessonsCount:  lessons.length,
    simulated:     successCount,
    skipped:       skippedCount,
    errors:        errorCount,
    distribution:  dist,
  })
})

module.exports = router