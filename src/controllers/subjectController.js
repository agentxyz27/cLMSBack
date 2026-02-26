/**
 * Subject Controller
 * 
 * Handles subject creation, retrieval, update, and deletion for teachers.
 * All actions are scoped to the logged-in teacher via req.user.id —
 * a teacher can only see and manage their own subjects.
 * 
 * createSubject → creates a subject owned by the logged-in teacher
 * getSubjects   → returns all subjects owned by the logged-in teacher
 * updateSubject → updates a subject title by ID
 * deleteSubject → deletes a subject by ID
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

/**
 * PUT /api/subjects/:id
 * Updates a subject title by ID.
 * parseInt converts URL param from string to integer to match DB type.
 */
const updateSubject = async (req, res) => {
  try {
    const { title } = req.body
    const id = parseInt(req.params.id)

    const subject = await prisma.subject.update({
      where: { id },
      data: { title }
    })

    res.json({ message: 'Subject updated', subject })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * DELETE /api/subjects/:id
 * Deletes a subject by ID.
 * Note: deleting a subject will fail if it has lessons — delete lessons first.
 */
const deleteSubject = async (req, res) => {
  try {
    const id = parseInt(req.params.id)

    await prisma.subject.delete({
      where: { id }
    })

    res.json({ message: 'Subject deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { createSubject, getSubjects, updateSubject, deleteSubject }