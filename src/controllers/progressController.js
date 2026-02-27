/**
 * Progress Controller
 * 
 * Tracks student completion and scores per lesson.
 * All actions are scoped to the logged-in student via req.user.id.
 * 
 * completeLesson → marks a lesson as completed and records score
 * getProgress    → returns all progress records for the logged-in student
 */
const prisma = require('../prisma')

/**
 * POST /api/progress
 * Marks a lesson as completed by the logged-in student.
 * Score is optional — not all lessons have scores.
 * Prevents duplicate progress records for the same lesson.
 */
const completeLesson = async (req, res) => {
  try {
    const { lessonId, score } = req.body
    const studentId = req.user.id

    // Check if progress already exists for this lesson
    const existing = await prisma.progress.findFirst({
      where: { studentId, lessonId }
    })

    if (existing) {
      // Update existing progress instead of creating duplicate
      const updated = await prisma.progress.update({
        where: { id: existing.id },
        data: { completed: true, score }
      })
      return res.json({ message: 'Progress updated', progress: updated })
    }

    // Create new progress record
    const progress = await prisma.progress.create({
      data: {
        studentId,
        lessonId,
        completed: true,
        score
      }
    })

    res.status(201).json({ message: 'Lesson completed', progress })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * GET /api/progress
 * Returns all progress records for the logged-in student.
 * Includes lesson details so frontend can display lesson title.
 */
const getProgress = async (req, res) => {
  try {
    const studentId = req.user.id

    const progress = await prisma.progress.findMany({
      where: { studentId },
      include: {
        lesson: {
          include: {
            subject: true // include subject so student knows which subject the lesson belongs to
          }
        }
      }
    })

    res.json(progress)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { completeLesson, getProgress }