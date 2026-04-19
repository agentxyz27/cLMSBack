/**
 * templateController.js
 *
 * createTemplate     → teacher creates a template
 * getPublicTemplates → browse all public templates
 * getMyTemplates     → teacher sees their own templates
 * updateTemplate     → teacher updates their template
 * deleteTemplate     → teacher deletes their template
 * useTemplate        → duplicate template into a new lesson
 */
const templateService = require('../services/templateService')


const createTemplate = async (req, res) => {
  try {
    const template = await templateService.createTemplate(req.user.id, req.body)
    res.status(201).json({ message: 'Template created', template })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

const getTemplate = async (req, res) => {
  try {
    const template = await templateService.getTemplate(req.params.id)
    res.json(template)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

const getPublicTemplates = async (req, res) => {
  try {
    const templates = await templateService.getPublicTemplates()
    res.json(templates)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

const getMyTemplates = async (req, res) => {
  try {
    const templates = await templateService.getMyTemplates(req.user.id)
    res.json(templates)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

const updateTemplate = async (req, res) => {
  try {
    const template = await templateService.updateTemplate(req.user.id, req.params.id, req.body)
    res.json({ message: 'Template updated', template })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

// Optional: publish/unpublish template (toggle isPublic)
const publishTemplate = async (req, res) => {
  try {
    const template = await templateService.publishTemplate(
      req.user.id,
      req.params.id,
      req.body.isPublic
    )
    res.json({ message: 'Template updated', template })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

const deleteTemplate = async (req, res) => {
  try {
    await templateService.deleteTemplate(req.user.id, req.params.id)
    res.json({ message: 'Template deleted' })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

const useTemplate = async (req, res) => {
  try {
    const lesson = await templateService.useTemplate(req.user.id, req.params.id, req.body)
    res.status(201).json({ message: 'Lesson created from template', lesson })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

module.exports = {
  createTemplate,
  getTemplate,
  getPublicTemplates,
  getMyTemplates,
  updateTemplate,
  deleteTemplate,
  useTemplate,
  publishTemplate
}