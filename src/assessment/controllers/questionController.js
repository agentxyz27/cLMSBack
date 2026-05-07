const questionService = require('../services/questionService')

const createQuestion = async (req, res) => {
  try {
    const question = await questionService.createQuestion(req.user.id, req.body)
    res.status(201).json({ message: 'Question created', question })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

const getQuestions = async (req, res) => {
  try {
    const questions = await questionService.getQuestions(req.params.lessonId)
    res.json(questions)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

const getQuestion = async (req, res) => {
  try {
    const question = await questionService.getQuestion(req.params.id)
    res.json(question)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

const updateQuestion = async (req, res) => {
  try {
    const updated = await questionService.updateQuestion(
      req.user.id,
      req.params.id,
      req.body
    )
    res.json({ message: 'Question updated', question: updated })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

const deleteQuestion = async (req, res) => {
  try {
    await questionService.deleteQuestion(req.user.id, req.params.id)
    res.json({ message: 'Question deleted' })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

const reorderQuestions = async (req, res) => {
  try {
    await questionService.reorderQuestions(req.user.id, req.params.lessonId, req.body.order)
    res.json({ message: 'Questions reordered' })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
}

module.exports = {
  createQuestion,
  getQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions
}