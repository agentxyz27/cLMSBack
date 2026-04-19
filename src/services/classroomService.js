/**
 * classroomService.js
 *
 * Handles classroom business logic.
 * A classroom links a teacher, a subject, and a section.
 * Teachers self-assign by creating a classroom.
 */
const prisma = require('../prisma')

/**
 * Teacher creates a classroom by picking a subject and section.
 * Validates that the subject is not locked before creating.
 * One teacher per subject per section — enforced by unique constraint.
 */
const createClassRoom = async (teacherId, { subjectId, sectionId }) => {
  subjectId = parseInt(subjectId)
  sectionId = parseInt(sectionId)

  const subject = await prisma.subject.findUnique({ where: { id: subjectId } })
  if (!subject) throw { status: 404, message: 'Subject not found' }
  if (subject.isLocked) throw { status: 403, message: 'This subject is not available yet' }

  const section = await prisma.section.findUnique({ where: { id: sectionId } })
  if (!section) throw { status: 404, message: 'Section not found' }

  try {
    const classRoom = await prisma.classRoom.create({
      data: { teacherId, subjectId, sectionId },
      include: {
        subject: { select: { id: true, name: true } },
        section: {
          select: {
            id: true,
            name: true,
            grade: { select: { id: true, level: true } }
          }
        }
      }
    })
    return classRoom
  } catch (err) {
    if (err.code === 'P2002') {
      throw { status: 400, message: 'You already have a classroom for this subject and section' }
    }
    throw err
  }
}

/**
 * Returns all classrooms owned by the logged-in teacher.
 * Includes subject and section info for display.
 */
const getMyClassRooms = async (teacherId) => {
  return await prisma.classRoom.findMany({
    where: { teacherId },
    include: {
      subject: { select: { id: true, name: true } },
      section: {
        select: {
          id: true,
          name: true,
          grade: { select: { id: true, level: true } }
        }
      },
      _count: { select: { lessons: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
}

/**
 * Returns a single classroom by ID.
 * Only the owning teacher can access it.
 */
const getClassRoom = async (teacherId, classRoomId) => {
  const classRoom = await prisma.classRoom.findUnique({
    where: { id: parseInt(classRoomId) },
    include: {
      subject: { select: { id: true, name: true } },
      section: {
        select: {
          id: true,
          name: true,
          grade: { select: { id: true, level: true } }
        }
      },
      lessons: {
        select: { id: true, title: true, createdAt: true, updatedAt: true },
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!classRoom) throw { status: 404, message: 'Classroom not found' }
  if (classRoom.teacherId !== teacherId) throw { status: 403, message: 'Access denied' }

  return classRoom
}

/**
 * Returns all classrooms in the student's section.
 * sectionId comes from the JWT — set on login.
 */
const getSectionClassRooms = async (sectionId) => {
  return await prisma.classRoom.findMany({
    where: { sectionId },
    include: {
      subject: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      _count: { select: { lessons: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
}

/**
 * Returns all lessons in a classroom.
 * Verifies the classroom belongs to the student's section.
 */
const getClassRoomLessons = async (sectionId, classRoomId) => {
  const classRoom = await prisma.classRoom.findUnique({
    where: { id: parseInt(classRoomId) },
    include: {
      lessons: {
        select: { id: true, title: true, createdAt: true, updatedAt: true },
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!classRoom) throw { status: 404, message: 'Classroom not found' }
  if (classRoom.sectionId !== sectionId) throw { status: 403, message: 'Access denied' }

  return classRoom.lessons
}

module.exports = { createClassRoom, getMyClassRooms, getClassRoom, getSectionClassRooms, getClassRoomLessons }