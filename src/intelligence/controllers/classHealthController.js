const classHealthService = require('../services/classHealthService')

const getHealth = async (req, res) => {
  try {
    const teacherId   = req.user.id
    const classRoomId = req.params.classRoomId

    const data = await classHealthService.getClassroomHealth(teacherId, classRoomId)
    res.json(data)
  } catch (err) {
    const status = err.status ?? 500
    res.status(status).json({ message: err.message ?? 'Internal server error' })
  }
}


const getTrend = async (req, res) => {
  try {
    const teacherId   = req.user.id
    const classRoomId = req.params.classRoomId
    const range       = req.query.range ?? 'week'

    const data = await classHealthService.getClassroomTrend(teacherId, classRoomId, range)
    res.json(data)
  } catch (err) {
    const status = err.status ?? 500
    res.status(status).json({ message: err.message ?? 'Internal server error' })
  }
}

module.exports = { getHealth, getTrend }