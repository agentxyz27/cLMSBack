/**
 * enrollmentController.js
 *
 * Handles student enrollment in subjects.
 *
 * enrollStudent      → teacher enrolls a student into their subject
 * getMySubjects      → student gets all subjects they are enrolled in (with blocks)
 * getAllSubjects      → student browses all available subjects (with blocks)
 * getSubjectStudents → teacher sees all students enrolled in a specific subject
 */

const prisma = require('../prisma')

/**
 * POST /api/enrollment
 * Teacher enrolls a student into one of their subjects.
 * teacherId from JWT is verified against the subject owner
 * to prevent a teacher from enrolling students into another teacher's subject.
 */
const enrollStudent = async (req, res) => {
  try {
    const { studentId, subjectId } = req.body
    const teacherId = req.user.id

    // Verify the subject belongs to the logged-in teacher
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
    // Prisma throws P2002 on unique constraint violation
    if (err.code === 'P2002') {
      return res.status(400).json({ message: 'Student already enrolled in this subject' })
    }
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * GET /api/enrollment/my-subjects
 * Returns all subjects the logged-in student is enrolled in.
 * Includes lessons with blocks (ordered) and teacher info.
 * Blocks are ordered by their position so frontend renders them correctly.
 */
const getMySubjects = async (req, res) => {
  try {
    const studentId = req.user.id

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        subject: {
          include: {
            lessons: {
              include: {
                blocks: {
                  orderBy: { order: 'asc' } // always return blocks in correct order
                }
              }
            },
            teacher: {
              select: { id: true, name: true } // exclude password
            }
          }
        }
      }
    })

    // Return just the subjects, not the enrollment wrapper
    const subjects = enrollments.map(e => e.subject)
    res.json(subjects)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * GET /api/enrollment/all-subjects
 * Returns all available subjects for browsing.
 * Any authenticated student can see all subjects.
 * Includes lessons with blocks (ordered) and teacher info.
 * Blocks are ordered by their position so frontend renders them correctly.
 */
const getAllSubjects = async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      include: {
        lessons: {
          include: {
            blocks: {
              orderBy: { order: 'asc' } // always return blocks in correct order
            }
          }
        },
        teacher: {
          select: { id: true, name: true } // exclude password
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
 * Includes student details but excludes password.
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