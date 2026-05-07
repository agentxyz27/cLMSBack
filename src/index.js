const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()

// ========================
// Middleware
// ========================

app.use(cors({ origin: 'http://localhost:5173' })) // allows Vite frontend to talk to this API
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

const classroomRoutes = require('./core/routes/classroom')
const sectionRoutes = require('./core/routes/section')
const subjectRoutes = require('./core/routes/subject')
const lessonRoutes = require('./core/routes/lessons')
const templateRoutes = require('./core/routes/templates')
const progressRoutes = require('./core/routes/progress')

const questionRoutes = require('./assessment/routes/questions')

const gamificationRoutes = require('./gamification/routes/gamification')

app.use('/api/auth', authRoutes)

app.use('/api', classroomRoutes)
app.use('/api/sections', sectionRoutes)
app.use('/api/subjects', subjectRoutes)
app.use('/api/lessons', lessonRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/progress', progressRoutes)

app.use('/api/questions', questionRoutes)

app.use('/api/gamification', gamificationRoutes)


// ========================
// Start Server
// ========================
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
