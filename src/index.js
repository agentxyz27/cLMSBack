const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()

// ========================
// Middleware
// ========================

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://eduforgeclms.vercel.app'
  ],
  credentials: true
}))
app.use(express.json())  // parses incoming JSON request bodies

// ========================
// Health Check
// ========================
app.get('/api/health', (req, res) => {
  res.json({ message: 'cLMS API running' })
})

// ========================
// Routes
// ========================
const authRoutes = require('./auth/routes/auth')

//Core
const classroomRoutes = require('./core/routes/classroom')
const sectionRoutes = require('./core/routes/section')
const subjectRoutes = require('./core/routes/subject')
const lessonRoutes = require('./core/routes/lessons')
const templateRoutes = require('./core/routes/templates')
const progressRoutes = require('./core/routes/progress')

//Assessment
const questionRoutes = require('./assessment/routes/questions')
const attemptRoutes = require('./assessment/routes/attempt')
const snapshotRoutes = require('./assessment/routes/snapshots')

//Intelligence
const detectionRoutes = require('./intelligence/routes/detection')
const focusRoutes = require('./intelligence/routes/focus')
const templateEngineRoutes = require('./intelligence/routes/templateEngine')
const progressEngineRoutes = require('./intelligence/routes/progressEngine')
const classHealthRoutes = require('./intelligence/routes/classHealth')
const classTrendRoutes = require('./intelligence/routes/classHealth')

//Gamified
const gamificationRoutes = require('./gamification/routes/gamification')

const uploadRoutes = require('./standby/upload')

const simulateRouter = require('./simulation/routes/simulate')


app.use('/api/auth', authRoutes)

app.use('/api', classroomRoutes)
app.use('/api/sections', sectionRoutes)
app.use('/api/subjects', subjectRoutes)
app.use('/api/lessons', lessonRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/progress', progressRoutes)

app.use('/api/questions', questionRoutes)
app.use('/api/attempts', attemptRoutes)
app.use('/api/snapshots', snapshotRoutes)

app.use('/api/detection', detectionRoutes)
app.use('/api/focus', focusRoutes)
app.use('/api/template-engine', templateEngineRoutes)
app.use('/api/progress-engine', progressEngineRoutes)
app.use('/api/classroom-health', classHealthRoutes)
app.use('/api/classroom-health/trend', classTrendRoutes)

app.use('/api/gamification', gamificationRoutes)

app.use('/api/upload', uploadRoutes)

app.use('/simulate', simulateRouter)



// ========================
// Start Server
// ========================
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
