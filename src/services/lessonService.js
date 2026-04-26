const prisma = require('../prisma')

const BLANK_LESSON = {
  nodes: [
    {
      id: 'node_1',
      type: 'explanation',
      contentJson: {
        canvas: { width: 1280, height: 720, background: '#ffffff' },
        elements: []
      },
      nextNodeId: null,
      hintNodeId: null
    }
  ],
  settings: {
    passingScore: 70,
    retryLimit: null,
    badgeId: null
  }
}

const createLesson = async (teacherId, { title, classRoomId, contentJson }) => {
  const classRoom = await prisma.classRoom.findUnique({
    where: { id: parseInt(classRoomId) }
  })

  if (!classRoom) throw { status: 404, message: 'Classroom not found' }
  if (classRoom.teacherId !== teacherId)
    throw { status: 403, message: 'Access denied' }

  return prisma.lesson.create({
    data: {
      title,
      classRoomId: parseInt(classRoomId),
      contentJson: contentJson ?? BLANK_LESSON
    }
  })
}

const getLessons = async (classRoomId) => {
  return prisma.lesson.findMany({
    where: { classRoomId: parseInt(classRoomId) },
    select: {
      id: true,
      title: true,
      classRoomId: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { createdAt: 'asc' }
  })
}

const getLesson = async (id) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: parseInt(id) }
  })

  if (!lesson) throw { status: 404, message: 'Lesson not found' }

  return lesson
}

const updateLesson = async (teacherId, id, { title, contentJson }) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: parseInt(id) },
    include: { classRoom: true }
  })

  if (!lesson) throw { status: 404, message: 'Lesson not found' }
  if (lesson.classRoom.teacherId !== teacherId)
    throw { status: 403, message: 'Access denied' }

  return prisma.lesson.update({
    where: { id: parseInt(id) },
    data: {
      title,
      contentJson
    }
  })
}

const deleteLesson = async (teacherId, id) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: parseInt(id) },
    include: { classRoom: true }
  })

  if (!lesson) throw { status: 404, message: 'Lesson not found' }
  if (lesson.classRoom.teacherId !== teacherId)
    throw { status: 403, message: 'Access denied' }

  return prisma.lesson.delete({
    where: { id: parseInt(id) }
  })
}

module.exports = {
  createLesson,
  getLessons,
  getLesson,
  updateLesson,
  deleteLesson
}