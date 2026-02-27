const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()

// ========================
// Middleware
// ========================
app.use(cors())          // allows frontend to talk to this API
app.use(express.json())  // parses incoming JSON request bodies

// ========================
// Health Check
// ========================
app.get('/', (req, res) => {
  res.json({ message: 'cLMS API running' })
})

// ========================
// Routes
// ========================
const authRoutes = require('./routes/auth')
const subjectRoutes = require('./routes/subjects')
const lessonRoutes = require('./routes/lessons')
const progressRoutes = require('./routes/progress')
const gamificationRoutes = require('./routes/gamification')

app.use('/api/auth', authRoutes)          // teacher/student auth
app.use('/api/subjects', subjectRoutes)   // subject CRUD (teacher only)
app.use('/api/lessons', lessonRoutes)     //lessons
app.use('/api/progress', progressRoutes)  //progress
app.use('/api/gamification', gamificationRoutes)

// ========================
// Start Server
// ========================
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
