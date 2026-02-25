const prisma = require('../prisma')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const registerTeacher = async (req, res) => {
  try {
    const { name, email, password } = req.body

    // check if teacher already exists
    const existing = await prisma.teacher.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ message: 'Email already in use' })

    // hash password
    const hashed = await bcrypt.hash(password, 10)

    // create teacher
    const teacher = await prisma.teacher.create({
      data: { name, email, password: hashed }
    })

    res.status(201).json({ message: 'Teacher registered', teacher: { id: teacher.id, name: teacher.name, email: teacher.email } })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const loginTeacher = async (req, res) => {
  try {
    const { email, password } = req.body

    const teacher = await prisma.teacher.findUnique({ where: { email } })
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' })

    const match = await bcrypt.compare(password, teacher.password)
    if (!match) return res.status(401).json({ message: 'Invalid password' })

    const token = jwt.sign({ id: teacher.id, role: 'teacher' }, process.env.JWT_SECRET, { expiresIn: '7d' })

    res.json({ message: 'Login successful', token })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { registerTeacher, loginTeacher }