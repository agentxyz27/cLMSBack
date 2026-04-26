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
const authRoutes = require('./routes/auth')
const sectionRoutes = require('./routes/section')
const classroomRoutes = require('./routes/classroom')
const lessonRoutes = require('./routes/lessons')
const progressRoutes = require('./routes/progress')
const gamificationRoutes = require('./routes/gamification')
const templateRoutes = require('./routes/templates')

app.use('/api/auth', authRoutes)          // teacher/student auth
app.use('/api/sections', sectionRoutes)   //sections for registration form
app.use('/api', classroomRoutes)
app.use('/api/lessons', lessonRoutes)     //lessons
app.use('/api/progress', progressRoutes)  //progress
app.use('/api/gamification', gamificationRoutes)
app.use('/api/upload', require('./routes/upload'))
app.use('/api/templates', templateRoutes)

// ========================
// Start Server
// ========================
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
