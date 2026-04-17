/**
 * templateController.js
 *
 * Handles template creation, retrieval, update, deletion, publishing, and duplication.
 *
 * Templates are reusable canvas layouts owned by either a teacher or an admin.
 * Ownership is stored as two nullable FKs — exactly one is set per template.
 *
 * Ownership rules (enforced here, not at DB layer):
 *   role === 'teacher' → teacherId = req.user.id, adminId = null
 *   role === 'admin'   → adminId = req.user.id,   teacherId = null
 *
 * Visibility rules:
 *   isPublic: false → only the owner can see it (draft)
 *   isPublic: true  → visible to all teachers in the global library
 *
 * createTemplate    → creates a new template owned by the requester
 * getMyTemplates    → returns all templates owned by the requester
 * getPublicTemplates → returns all published templates (any teacher can browse)
 * getTemplate       → returns a single template (owner or public only)
 * updateTemplate    → updates title and/or contentJson (owner only)
 * publishTemplate   → sets isPublic to true (owner only)
 * unpublishTemplate → sets isPublic to false (owner only)
 * duplicateTemplate → copies a public template into a new lesson for a teacher
 * deleteTemplate    → deletes a template (owner only)
 */

const prisma = require('../prisma')

// ── Ownership helpers ──────────────────────────────────────────────────────

/**
 * Builds the ownership FK pair from the requesting user's role.
 * Returns { teacherId, adminId } with exactly one set.
 */
const ownershipData = (user) => {
  if (user.role === 'teacher') return { teacherId: user.id, adminId: null }
  if (user.role === 'admin')   return { adminId: user.id, teacherId: null }
  return null
}

/**
 * Builds a Prisma where clause to check if the requesting user owns a template.
 */
const ownershipWhere = (user, templateId) => {
  if (user.role === 'teacher') return { id: templateId, teacherId: user.id }
  if (user.role === 'admin')   return { id: templateId, adminId: user.id }
  return null
}

// ── Controllers ────────────────────────────────────────────────────────────

/**
 * POST /api/templates
 * Creates a new template owned by the requesting teacher or admin.
 * isPublic defaults to false — templates start as drafts.
 * contentJson is required — templates must always have content.
 */
const createTemplate = async (req, res) => {
  try {
    const { title, contentJson } = req.body

    if (!contentJson) {
      return res.status(400).json({ message: 'contentJson is required for templates' })
    }

    const ownership = ownershipData(req.user)
    if (!ownership) {
      return res.status(403).json({ message: 'Only teachers and admins can create templates' })
    }

    const template = await prisma.template.create({
      data: {
        title,
        contentJson,
        isPublic: false,
        ...ownership
      }
    })

    res.status(201).json({ message: 'Template created', template })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * GET /api/templates/mine
 * Returns all templates owned by the requesting user.
 * Includes both drafts and published templates.
 * contentJson excluded — list view only.
 */
const getMyTemplates = async (req, res) => {
  try {
    const where = req.user.role === 'teacher'
      ? { teacherId: req.user.id }
      : { adminId: req.user.id }

    const templates = await prisma.template.findMany({
      where,
      select: {
        id: true,
        title: true,
        isPublic: true,
        usageCount: true,
        createdAt: true,
        updatedAt: true
        // contentJson excluded — too heavy for list view
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(templates)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * GET /api/templates/public
 * Returns all published templates visible to any teacher.
 * contentJson excluded — list view only.
 * Used to browse the global template library.
 */
const getPublicTemplates = async (req, res) => {
  try {
    const templates = await prisma.template.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        title: true,
        usageCount: true,
        createdAt: true,
        updatedAt: true,
        // Include owner name for attribution in the library UI
        teacher: { select: { name: true } },
        admin:   { select: { name: true } }
        // contentJson excluded — load on demand via getTemplate
      },
      orderBy: { usageCount: 'desc' } // most used templates first
    })

    res.json(templates)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * GET /api/templates/:id
 * Returns a single template with full contentJson.
 * Accessible if:
 *   - requester is the owner, OR
 *   - template is public (any authenticated user can load it)
 */
const getTemplate = async (req, res) => {
  try {
    const id = parseInt(req.params.id)

    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        teacher: { select: { name: true } },
        admin:   { select: { name: true } }
      }
    })

    if (!template) {
      return res.status(404).json({ message: 'Template not found' })
    }

    // Check access — owner or public
    const isOwner =
      (req.user.role === 'teacher' && template.teacherId === req.user.id) ||
      (req.user.role === 'admin'   && template.adminId   === req.user.id)

    if (!template.isPublic && !isOwner) {
      return res.status(403).json({ message: 'Access denied — template is private' })
    }

    res.json(template)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * PUT /api/templates/:id
 * Updates title and/or contentJson.
 * Owner only — teacher or admin who created it.
 */
const updateTemplate = async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { title, contentJson } = req.body

    const where = ownershipWhere(req.user, id)
    if (!where) return res.status(403).json({ message: 'Access denied' })

    // Verify ownership before updating
    const existing = await prisma.template.findFirst({ where })
    if (!existing) {
      return res.status(404).json({ message: 'Template not found or access denied' })
    }

    const data = {}
    if (title       !== undefined) data.title       = title
    if (contentJson !== undefined) data.contentJson = contentJson

    const template = await prisma.template.update({
      where: { id },
      data
    })

    res.json({ message: 'Template updated', template })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * POST /api/templates/:id/publish
 * Sets isPublic to true — makes template visible in the global library.
 * Owner only.
 */
const publishTemplate = async (req, res) => {
  try {
    const id = parseInt(req.params.id)

    const where = ownershipWhere(req.user, id)
    if (!where) return res.status(403).json({ message: 'Access denied' })

    const existing = await prisma.template.findFirst({ where })
    if (!existing) {
      return res.status(404).json({ message: 'Template not found or access denied' })
    }

    const template = await prisma.template.update({
      where: { id },
      data: { isPublic: true }
    })

    res.json({ message: 'Template published', template })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * POST /api/templates/:id/unpublish
 * Sets isPublic to false — removes template from the global library.
 * Owner only.
 */
const unpublishTemplate = async (req, res) => {
  try {
    const id = parseInt(req.params.id)

    const where = ownershipWhere(req.user, id)
    if (!where) return res.status(403).json({ message: 'Access denied' })

    const existing = await prisma.template.findFirst({ where })
    if (!existing) {
      return res.status(404).json({ message: 'Template not found or access denied' })
    }

    const template = await prisma.template.update({
      where: { id },
      data: { isPublic: false }
    })

    res.json({ message: 'Template unpublished', template })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * POST /api/templates/:id/duplicate
 * Copies a public template's contentJson into a new lesson owned by the teacher.
 * Requires: subjectId in request body — the lesson must belong to a subject.
 * Increments usageCount on the source template.
 * Teacher only — students cannot duplicate templates into lessons.
 *
 * Returns the newly created lesson, not the template.
 */
const duplicateTemplate = async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { subjectId, title } = req.body

    if (!subjectId) {
      return res.status(400).json({ message: 'subjectId is required to duplicate a template into a lesson' })
    }

    // Load the template — must be public or owned by requester
    const template = await prisma.template.findUnique({ where: { id } })

    if (!template) {
      return res.status(404).json({ message: 'Template not found' })
    }

    const isOwner =
      (req.user.role === 'teacher' && template.teacherId === req.user.id) ||
      (req.user.role === 'admin'   && template.adminId   === req.user.id)

    if (!template.isPublic && !isOwner) {
      return res.status(403).json({ message: 'Access denied — template is private' })
    }

    // Run as a transaction — create lesson and increment usageCount together
    // If either fails, both are rolled back
    const [lesson] = await prisma.$transaction([
      prisma.lesson.create({
        data: {
          title: title || template.title, // use provided title or fall back to template title
          subjectId,
          contentJson: template.contentJson
        }
      }),
      prisma.template.update({
        where: { id },
        data: { usageCount: { increment: 1 } }
      })
    ])

    res.status(201).json({ message: 'Template duplicated into lesson', lesson })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * DELETE /api/templates/:id
 * Deletes a template permanently.
 * Owner only.
 */
const deleteTemplate = async (req, res) => {
  try {
    const id = parseInt(req.params.id)

    const where = ownershipWhere(req.user, id)
    if (!where) return res.status(403).json({ message: 'Access denied' })

    const existing = await prisma.template.findFirst({ where })
    if (!existing) {
      return res.status(404).json({ message: 'Template not found or access denied' })
    }

    await prisma.template.delete({ where: { id } })

    res.json({ message: 'Template deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = {
  createTemplate,
  getMyTemplates,
  getPublicTemplates,
  getTemplate,
  updateTemplate,
  publishTemplate,
  unpublishTemplate,
  duplicateTemplate,
  deleteTemplate
}