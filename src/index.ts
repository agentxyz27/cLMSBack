import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()

const app = express()

// ========================
// Middleware
// ========================
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// ========================
// Health Check
// ========================
app.get('/api/health', (req, res) => {
  res.json({ message: 'cLMS API running' })
})

// ========================
// Routes
// ========================
import authRoutes from './auth/routes/auth'
// Core
import classroomRoutes from './core/routes/classroom'
import sectionRoutes from './core/routes/section'
import subjectRoutes from './core/routes/subject'
import lessonRoutes from './core/routes/lessons'
import templateRoutes from './core/routes/templates'
import progressRoutes from './core/routes/progress'
// Assessment
import questionRoutes from './assessment/routes/questions'
import attemptRoutes from './assessment/routes/attempt'
import snapshotRoutes from './assessment/routes/snapshots'
// Intelligence
import detectionRoutes from './intelligence/routes/detection'
import focusRoutes from './intelligence/routes/focus'
import templateEngineRoutes from './intelligence/routes/templateEngine'
import progressEngineRoutes from './intelligence/routes/progressEngine'
// Gamification
import gamificationRoutes from './gamification/routes/gamification'

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
app.use('/api/gamification', gamificationRoutes)

// ========================
// Start Server
// ========================
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))