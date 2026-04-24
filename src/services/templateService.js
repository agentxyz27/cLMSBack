/**
 * templateService.js
 *
 * Handles template business logic.
 * Templates are reusable canvas layouts owned by teachers.
 * Public templates are visible to all teachers.
 * Duplicating a template creates a new lesson under a classroom.
 */
const prisma = require('../prisma')

/**
 * Creates a new template owned by the logged-in teacher.
 */
const createTemplate = async (teacherId, { title, contentJson, isPublic }) => {
  return await prisma.template.create({
    data: {
      title,
      contentJson,
      isPublic: isPublic ?? false,
      teacherId
    }
  })
}


const getTemplate = async (templateId) => {
  const template = await prisma.template.findUnique({
    where: { id: parseInt(templateId) },
    include: { teacher: { select: { id: true, name: true } } }
  })
  if (!template) throw { status: 404, message: 'Template not found' }
  return template
}

/**
 * Returns all public templates for browsing.
 * Includes owner name for attribution.
 */
const getPublicTemplates = async () => {
  return await prisma.template.findMany({
    where: { isPublic: true },
    select: {
      id: true,
      title: true,
      isPublic: true,
      usageCount: true,
      createdAt: true,
      contentJson: true,
      teacher: { select: { id: true, name: true } }
    },
    orderBy: { usageCount: 'desc' }
  })
}

/**
 * Returns all templates owned by the logged-in teacher.
 */
const getMyTemplates = async (teacherId) => {
  return await prisma.template.findMany({
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
 * Updates a template's title, contentJson, or isPublic.
 * Only the owning teacher can update.
 */
const updateTemplate = async (teacherId, templateId, { title, contentJson, isPublic }) => {
  const template = await prisma.template.findUnique({
    where: { id: parseInt(templateId) }
  })
  if (!template) throw { status: 404, message: 'Template not found' }
  if (template.teacherId !== teacherId) throw { status: 403, message: 'Access denied' }

  const data = {}
  if (title !== undefined) data.title = title
  if (contentJson !== undefined) data.contentJson = contentJson
  if (isPublic !== undefined) data.isPublic = isPublic

  return await prisma.template.update({ where: { id: parseInt(templateId) }, data })
}

/**
 * Toggles the public visibility of a template.
 * Only the owning teacher can publish/unpublish.
 */
const publishTemplate = async (teacherId, templateId, isPublic) => {
  const template = await prisma.template.findUnique({
    where: { id: parseInt(templateId) }
  })
  if (!template) throw { status: 404, message: 'Template not found' }
  if (template.teacherId !== teacherId) throw { status: 403, message: 'Access denied' }

  return await prisma.template.update({
    where: { id: parseInt(templateId) },
    data: { isPublic }
  })
}


/**
 * Deletes a template.
 * Only the owning teacher can delete.
 */
const deleteTemplate = async (teacherId, templateId) => {
  const template = await prisma.template.findUnique({
    where: { id: parseInt(templateId) }
  })
  if (!template) throw { status: 404, message: 'Template not found' }
  if (template.teacherId !== teacherId) throw { status: 403, message: 'Access denied' }

  await prisma.template.delete({ where: { id: parseInt(templateId) } })
}

/**
 * Duplicates a template into a new lesson under a classroom.
 * Verifies the classroom belongs to the logged-in teacher.
 * Increments usageCount on the template.
 */
const useTemplate = async (teacherId, templateId, { classRoomId, title }) => {
  const template = await prisma.template.findUnique({
    where: { id: parseInt(templateId) }
  })
  if (!template) throw { status: 404, message: 'Template not found' }

  // Verify classroom belongs to this teacher
  const classRoom = await prisma.classRoom.findUnique({
    where: { id: parseInt(classRoomId) }
  })
  if (!classRoom) throw { status: 404, message: 'Classroom not found' }
  if (classRoom.teacherId !== teacherId) throw { status: 403, message: 'Access denied' }

  // Create new lesson from template canvas
  const lesson = await prisma.lesson.create({
    data: {
      title: title || template.title,
      contentJson: template.contentJson,
      classRoomId: parseInt(classRoomId)
    }
  })

  // Increment usage count
  await prisma.template.update({
    where: { id: parseInt(templateId) },
    data: { usageCount: { increment: 1 } }
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