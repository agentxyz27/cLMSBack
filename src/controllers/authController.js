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

module.exports = { registerTeacher, loginTeacher }