const prisma = require('../prisma')

const enrollStudent = async (req, res) => {
  try {
    const { studentId, subjectId } = req.body
    const teacherId = req.user.id

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId }
    })

    if (!subject) return res.status(404).json({ message: 'Subject not found' })
    if (subject.teacherId !== teacherId) {
      return res.status(403).json({ message: 'You do not own this subject' })
    }

    const enrollment = await prisma.enrollment.create({
      data: { studentId, subjectId }
    })

    res.status(201).json({ message: 'Student enrolled successfully', enrollment })
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ message: 'Student already enrolled in this subject' })
    }
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getMySubjects = async (req, res) => {
  try {
    const studentId = req.user.id

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        subject: {
          include: {
            lessons: true,
            teacher: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    const subjects = enrollments.map(e => e.subject)
    res.json(subjects)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getAllSubjects = async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      include: {
        lessons: true,
        teacher: {
          select: { id: true, name: true }
        }
      }
    })

    res.json(subjects)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * GET /api/enrollment/subject/:id
 * Returns all students enrolled in a specific subject.
 * Teacher uses this to see who is in their class.
 */
const getSubjectStudents = async (req, res) => {
  try {
    const subjectId = parseInt(req.params.id)

    const enrollments = await prisma.enrollment.findMany({
      where: { subjectId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            lrn: true,
            xp: true,
            level: true
          }
        }
      }
    })

    res.json(enrollments)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { enrollStudent, getMySubjects, getAllSubjects, getSubjectStudents }