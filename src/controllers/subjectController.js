/**
 * Subject Controller
 * 
 * Handles subject creation and retrieval for teachers.
 * All actions are scoped to the logged-in teacher via req.user.id —
 * a teacher can only see and manage their own subjects.
 * 
 * createSubject → creates a subject owned by the logged-in teacher
 * getSubjects   → returns all subjects owned by the logged-in teacher
 */
const prisma = require('../prisma')

/**
 * POST /api/subjects
 * Creates a new subject and links it to the logged-in teacher.
 * teacherId comes from the JWT token — not from the request body.
 * This prevents a teacher from creating subjects under another teacher's account.
 */
const createSubject = async (req, res) => {
  try {
    const { title } = req.body

    const subject = await prisma.subject.create({
      data: {
        title,
        teacherId: req.user.id // from decoded JWT, not user input
      }
    })

    res.status(201).json({ message: 'Subject created', subject })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * GET /api/subjects
 * Returns all subjects belonging to the logged-in teacher.
 * Includes lessons so the frontend can display them without a separate request.
 */
const getSubjects = async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { teacherId: req.user.id }, // scoped to logged-in teacher only
      include: { lessons: true } // eager load lessons to avoid extra API calls
    })

    res.json(subjects)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { createSubject, getSubjects }