const attemptService = require('../services/attemptService')

// ── Start Question ─────────────────────────────────────────────────────────
// Student opens a question.
// Creates a QuestionAttemptSession + fires SESSION_STARTED event.
// Returns the session token so the frontend can resume if interrupted.
const startQuestion = async (req, res) => {
  try {
    const session = await attemptService.startQuestion(
      req.user.id,
      req.params.questionId
    )
    res.status(201).json({ message: 'Session started', session })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Submit Answer ──────────────────────────────────────────────────────────
// Student submits an answer attempt.
// Fires ATTEMPT_SUBMITTED event.
// If correct → fires SESSION_FINISHED, finalizes session.
// If wrong   → increments attempts, session stays open.
const submitAnswer = async (req, res) => {
  try {
    const result = await attemptService.submitAnswer(
      req.user.id,
      req.params.sessionToken,
      req.body
    )
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Use Hint ───────────────────────────────────────────────────────────────
// Student requests a hint during an attempt.
// Fires HINT_OPENED event, increments hintsUsed on session.
const useHint = async (req, res) => {
  try {
    const result = await attemptService.useHint(
      req.user.id,
      req.params.sessionToken,
      req.body.hintIndex
    )
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Finish Session ─────────────────────────────────────────────────────────
// Student gives up or exits without getting it correct.
// Fires SESSION_FINISHED with correct = false.
// Finalizes the session so it doesn't stay open forever.
const finishSession = async (req, res) => {
  try {
    const result = await attemptService.finishSession(
      req.user.id,
      req.params.sessionToken
    )
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

// ── Get Session ────────────────────────────────────────────────────────────
// Returns the current state of a session.
// Used by frontend to resume an interrupted session.
const getSession = async (req, res) => {
  try {
    const session = await attemptService.getSession(
      req.user.id,
      req.params.sessionToken
    )
    res.json(session)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

module.exports = {
  startQuestion,
  submitAnswer,
  useHint,
  finishSession,
  getSession
}