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

app.use('/api/auth', authRoutes)        // teacher/student auth
app.use('/api/subjects', subjectRoutes) // subject CRUD (teacher only)
app.use('/api/lessons', lessonRoutes)   //lessons

// ========================
// Start Server
// ========================
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))