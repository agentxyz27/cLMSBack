/**
 * templateService.js
 *
 * Templates are now FULL LESSON BLUEPRINTS.
 * They use the exact same structure as lessons:
 *
 * {
 *   nodes: LessonNode[],
 *   settings: LessonSettings
 * }
 *
 * No conversion layer exists anymore.
 * Templates are directly reusable lessons.
 */

const prisma = require('../prisma')

/**
 * Create template (must already be a valid lesson graph)
 */
const createTemplate = async (teacherId, { title, contentJson, isPublic }) => {
  // Optional: basic validation guard (prevents broken saves)
  if (!contentJson?.nodes || !Array.isArray(contentJson.nodes)) {
    throw { status: 400, message: 'Template must contain nodes[] (lesson graph format)' }
  }

  return prisma.template.create({
    data: {
      title,
      contentJson, // FULL LESSON GRAPH
      isPublic: isPublic ?? false,
      teacherId
    }
  })
}

/**
 * Get single template
 */
const getTemplate = async (templateId) => {
  const template = await prisma.template.findUnique({
    where: { id: parseInt(templateId) },
    include: {
      teacher: {
        select: { id: true, name: true }
      }
    }
  })

  if (!template) {
    throw { status: 404, message: 'Template not found' }
  }

  return template
}

/**
 * Get all public templates
 */
const getPublicTemplates = async () => {
  return prisma.template.findMany({
    where: { isPublic: true },
    select: {
      id: true,
      title: true,
      isPublic: true,
      usageCount: true,
      createdAt: true,
      contentJson: true, // FULL LESSON GRAPH
      teacher: {
        select: { id: true, name: true }
      }
    },
    orderBy: { usageCount: 'desc' }
  })
}

/**
 * Get teacher's templates
 */
const getMyTemplates = async (teacherId) => {
  return prisma.template.findMany({
    where: { teacherId },
    select: {
      id: true,
      title: true,
      isPublic: true,
      usageCount: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { createdAt: 'desc' }
  })
}

/**
 * Update template (FULL GRAPH EDITING)
 */
const updateTemplate = async (teacherId, templateId, { title, contentJson, isPublic }) => {
  const template = await prisma.template.findUnique({
    where: { id: parseInt(templateId) }
  })

  if (!template) throw { status: 404, message: 'Template not found' }
  if (template.teacherId !== teacherId) throw { status: 403, message: 'Access denied' }

  const data = {}

  if (title !== undefined) data.title = title
  if (contentJson !== undefined) {
    if (!contentJson?.nodes || !Array.isArray(contentJson.nodes)) {
      throw { status: 400, message: 'Invalid lesson graph format' }
    }
    data.contentJson = contentJson
  }
  if (isPublic !== undefined) data.isPublic = isPublic

  return prisma.template.update({
    where: { id: parseInt(templateId) },
    data
  })
}

/**
 * Publish / unpublish template
 */
const publishTemplate = async (teacherId, templateId, isPublic) => {
  const template = await prisma.template.findUnique({
    where: { id: parseInt(templateId) }
  })

  if (!template) throw { status: 404, message: 'Template not found' }
  if (template.teacherId !== teacherId) throw { status: 403, message: 'Access denied' }

  return prisma.template.update({
    where: { id: parseInt(templateId) },
    data: { isPublic }
  })
}

/**
 * Delete template
 */
const deleteTemplate = async (teacherId, templateId) => {
  const template = await prisma.template.findUnique({
    where: { id: parseInt(templateId) }
  })

  if (!template) throw { status: 404, message: 'Template not found' }
  if (template.teacherId !== teacherId) throw { status: 403, message: 'Access denied' }

  await prisma.template.delete({
    where: { id: parseInt(templateId) }
  })
}

/**
 * Use template → directly becomes a lesson (NO TRANSFORMATION)
 */
const useTemplate = async (teacherId, templateId, { classRoomId, title }) => {
  const template = await prisma.template.findUnique({
    where: { id: parseInt(templateId) }
  })

  if (!template) throw { status: 404, message: 'Template not found' }

  const classRoom = await prisma.classRoom.findUnique({
    where: { id: parseInt(classRoomId) }
  })

  if (!classRoom) throw { status: 404, message: 'Classroom not found' }
  if (classRoom.teacherId !== teacherId) {
    throw { status: 403, message: 'Access denied' }
  }

  // Direct clone (this is now safe because formats are identical)
  const lesson = await prisma.lesson.create({
    data: {
      title: title || template.title,
      classRoomId: parseInt(classRoomId),
      contentJson: template.contentJson
    }
  })

  await prisma.template.update({
    where: { id: parseInt(templateId) },
    data: {
      usageCount: { increment: 1 }
    }
  })

  return lesson
}

module.exports = {
  createTemplate,
  getTemplate,
  getPublicTemplates,
  getMyTemplates,
  updateTemplate,
  publishTemplate,
  deleteTemplate,
  useTemplate
}