const express    = require('express')
const router     = express.Router()
const  protect     = require('../../middleware/auth')
const  requireRole  = require('../../middleware/requireRole')
const { getHealth, getTrend }  = require('../controllers/classHealthController')

// GET /intelligence/classroom-health/:classRoomId
// Teacher only — verifies ownership inside the service
router.get('/:classRoomId', protect, requireRole('teacher'), getHealth)
router.get('/:classRoomId/trend',  protect, requireRole('teacher'), getTrend)

module.exports = router