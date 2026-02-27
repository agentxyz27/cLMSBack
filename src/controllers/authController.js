/**
 * Auth Controller
 * 
 * Handles teacher registration and login.
 * 
 * registerTeacher → hashes password, stores teacher in DB
 * loginTeacher    → verifies password, returns JWT token
 */
const prisma = require('../prisma')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')



/**
 * POST /api/auth/register
 * Creates a new teacher account.
 * Password is hashed with bcrypt before storing — never stored as plain text.
 */
const registerTeacher = async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Prevent duplicate accounts
    const existing = await prisma.teacher.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ message: 'Email already in use' })

    // Hash password with salt rounds of 10
    // Higher rounds = more secure but slower — 10 is the industry standard
    const hashed = await bcrypt.hash(password, 10)

    // Store teacher — never return the password in the response
    const teacher = await prisma.teacher.create({
      data: { name, email, password: hashed }
    })

    res.status(201).json({ message: 'Teacher registered', teacher: { id: teacher.id, name: teacher.name, email: teacher.email } })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * POST /api/auth/login
 * Authenticates a teacher and returns a JWT token.
 * Token expires in 7 days — frontend must store and send it with every request.
 */
const loginTeacher = async (req, res) => {
  try {
    const { email, password } = req.body

    const teacher = await prisma.teacher.findUnique({ where: { email } })
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' })

    // bcrypt compares plain text password against stored hash
    // never decrypt — only compare
    const match = await bcrypt.compare(password, teacher.password)
    if (!match) return res.status(401).json({ message: 'Invalid password' })

    // Embed id and role in token so protected routes know who is requesting
    // and what permissions they have without hitting the DB every time
    const token = jwt.sign({ id: teacher.id, role: 'teacher' }, process.env.JWT_SECRET, { expiresIn: '7d' })

    res.json({ message: 'Login successful', token })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * POST /api/auth/student/register
 * Creates a new student account.
 * LRN (Learner Reference Number) is required and must be unique.
 */
const registerStudent = async (req, res) => {
  try {
    const { name, email, password, lrn } = req.body

    // Prevent duplicate accounts
    const existing = await prisma.student.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ message: 'Email already in use' })

    // Check if LRN is already registered
    const existingLrn = await prisma.student.findUnique({ where: { lrn } })
    if (existingLrn) return res.status(400).json({ message: 'LRN already registered' })

    // Hash password — never store plain text
    const hashed = await bcrypt.hash(password, 10)

    const student = await prisma.student.create({
      data: { name, email, password: hashed, lrn }
    })

    res.status(201).json({ message: 'Student registered', student: { id: student.id, name: student.name, email: student.email, lrn: student.lrn } })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * POST /api/auth/student/login
 * Authenticates a student and returns a JWT token.
 * Token contains id and role: 'student' for route protection.
 */
const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body

    const student = await prisma.student.findUnique({ where: { email } })
    if (!student) return res.status(404).json({ message: 'Student not found' })

    const match = await bcrypt.compare(password, student.password)
    if (!match) return res.status(401).json({ message: 'Invalid password' })

    // Role is 'student' — used later to restrict access to student-only routes
    const token = jwt.sign({ id: student.id, role: 'student' }, process.env.JWT_SECRET, { expiresIn: '7d' })

    res.json({ message: 'Login successful', token })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { registerTeacher, loginTeacher, registerStudent, loginStudent }