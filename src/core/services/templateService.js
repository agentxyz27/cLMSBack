/**
 * templateService.js
 *
 * Templates are FULL LESSON BLUEPRINTS tagged to a topic + difficulty.
 * This enables the Template Engine to match templates to student weaknesses.
 *
 * Required fields on create:
 *   topicId         → which topic this template remediates
 *   difficulty      → 1 = easiest (matched to student weakness severity)
 *   interactionType → which frontend component renders this template
 *   contentJson     → full lesson graph (nodes + settings)
 */

const prisma = require('../../prisma')

// ── Create ─────────────────────────────────────────────────────────────────
const createTemplate = async (teacherId, { title, contentJson, isPublic, topicId, difficulty, interactionType }) => {
  if (!contentJson?.nodes || !Array.isArray(contentJson.nodes))
    throw { status: 400, message: 'Template must contain nodes[] (lesson graph format)' }

  if (!topicId)       throw { status: 400, message: 'topicId is required' }
  if (!difficulty)    throw { status: 400, message: 'difficulty is required' }
  if (!interactionType) throw { status: 400, message: 'interactionType is required' }

  const topic = await prisma.topic.findUnique({ where: { id: parseInt(topicId) } })
  if (!topic) throw { status: 404, message: 'Topic not found' }

  return prisma.template.create({
    data: {
      title,
      contentJson,
      isPublic:       isPublic ?? false,
      teacherId,
      topicId:        parseInt(topicId),
      difficulty:     parseInt(difficulty),
      interactionType
    },
    include: {
      topic: { select: { id: true, name: true } }
    }
  })
}

// ── Get Single ─────────────────────────────────────────────────────────────
const getTemplate = async (templateId) => {
  const template = await prisma.template.findUnique({
    where: { id: parseInt(templateId) },
    include: {
      topic:   { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } }
    }
  })

  if (!template) throw { status: 404, message: 'Template not found' }

  return template
}

// ── Get Public Templates ───────────────────────────────────────────────────
const getPublicTemplates = async () => {
  return prisma.template.findMany({
    where:   { isPublic: true },
    include: {
      topic:   { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } }
    },
    orderBy: { usageCount: 'desc' }
  })
}

// ── Get My Templates ───────────────────────────────────────────────────────
const getMyTemplates = async (teacherId) => {
  return prisma.template.findMany({
    where:   { teacherId },
    include: {
      topic: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
}

// ── Update ─────────────────────────────────────────────────────────────────
const updateTemplate = async (teacherId, templateId, { title, contentJson, isPublic, topicId, difficulty, interactionType }) => {
  const template = await prisma.template.findUnique({
    where: { id: parseInt(templateId) }
  })

  if (!template) throw { status: 404, message: 'Template not found' }
  if (template.teacherId !== teacherId) throw { status: 403, message: 'Access denied' }

  const data = {}

  if (title !== undefined)           data.title = title
  if (isPublic !== undefined)        data.isPublic = isPublic
  if (difficulty !== undefined)      data.difficulty = parseInt(difficulty)
  if (interactionType !== undefined) data.interactionType = interactionType

  if (topicId !== undefined) {
    const topic = await prisma.topic.findUnique({ where: { id: parseInt(topicId) } })
    if (!topic) throw { status: 404, message: 'Topic not found' }
    data.topicId = parseInt(topicId)
  }

  if (contentJson !== undefined) {
    if (!contentJson?.nodes || !Array.isArray(contentJson.nodes))
      throw { status: 400, message: 'Invalid lesson graph format' }
    data.contentJson = contentJson
  }

  return prisma.template.update({
    where:   { id: parseInt(templateId) },
    data,
    include: {
      topic: { select: { id: true, name: true } }
    }
  })
}

// ── Publish / Unpublish ────────────────────────────────────────────────────
const publishTemplate = async (teacherId, templateId, isPublic) => {
  const template = await prisma.template.findUnique({
    where: { id: parseInt(templateId) }
  })

  if (!template) throw { status: 404, message: 'Template not found' }
  if (template.teacherId !== teacherId) throw { status: 403, message: 'Access denied' }

  return prisma.template.update({
    where: { id: parseInt(templateId) },
    data:  { isPublic }
  })
}

// ── Delete ─────────────────────────────────────────────────────────────────
const deleteTemplate = async (teacherId, templateId) => {
  const template = await prisma.template.findUnique({
    where: { id: parseInt(templateId) }
  })

  if (!template) throw { status: 404, message: 'Template not found' }
  if (template.teacherId !== teacherId) throw { status: 403, message: 'Access denied' }

  await prisma.template.delete({ where: { id: parseInt(templateId) } })
}

// ── Use Template ───────────────────────────────────────────────────────────
// Clones template contentJson directly into a new lesson.
// No transformation needed — formats are identical.
const useTemplate = async (teacherId, templateId, { classRoomId, title }) => {
  const template = await prisma.template.findUnique({
    where: { id: parseInt(templateId) }
  })
  if (!template) throw { status: 404, message: 'Template not found' }

  const classRoom = await prisma.classRoom.findUnique({
    where: { id: parseInt(classRoomId) }
  })
  if (!classRoom) throw { status: 404, message: 'Classroom not found' }
  if (classRoom.teacherId !== teacherId) throw { status: 403, message: 'Access denied' }

  const lesson = await prisma.lesson.create({
    data: {
      title:       title || template.title,
      classRoomId: parseInt(classRoomId),
      contentJson: template.contentJson
    }
  })

  await prisma.template.update({
    where: { id: parseInt(templateId) },
    data:  { usageCount: { increment: 1 } }
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