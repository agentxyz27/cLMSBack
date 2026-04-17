const prisma = require('../prisma')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

/**
 * ROLE CONFIG
 * Centralized mapping for role-based profile fetching
 */
const roleConfig = {
  teacher: {
    model: prisma.teacher,
    select: { id: true, name: true, email: true, createdAt: true }
  },
  student: {
    model: prisma.student,
    select: {
      id: true,
      name: true,
      email: true,
      lrn: true,
      xp: true,
      level: true,
      createdAt: true
    }
  },
  admin: {
    model: prisma.admin,
    select: { id: true, name: true, email: true, createdAt: true }
  }
}

/**
 * JWT GENERATOR
 */
const generateToken = (user, role) => {
  return jwt.sign(
    { id: user.id, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

/**
 * TEACHER
 */
const registerTeacher = async ({ name, email, password }) => {
  const existing = await prisma.teacher.findUnique({ where: { email } })
  if (existing) throw { status: 400, message: 'Email already in use' }

  const hashed = await bcrypt.hash(password, 10)

  const teacher = await prisma.teacher.create({
    data: { name, email, password: hashed }
  })

  return {
    id: teacher.id,
    name: teacher.name,
    email: teacher.email
  }
}

const loginTeacher = async ({ email, password }) => {
  const teacher = await prisma.teacher.findUnique({ where: { email } })
  if (!teacher) throw { status: 404, message: 'Teacher not found' }

  const match = await bcrypt.compare(password, teacher.password)
  if (!match) throw { status: 401, message: 'Invalid password' }

  return {
    message: 'Login successful',
    token: generateToken(teacher, 'teacher')
  }
}

/**
 * STUDENT
 */
const registerStudent = async ({ name, email, password, lrn }) => {
  const existing = await prisma.student.findUnique({ where: { email } })
  if (existing) throw { status: 400, message: 'Email already in use' }

  const existingLrn = await prisma.student.findUnique({ where: { lrn } })
  if (existingLrn) throw { status: 400, message: 'LRN already registered' }

  const hashed = await bcrypt.hash(password, 10)

  const student = await prisma.student.create({
    data: { name, email, password: hashed, lrn }
  })

  return {
    id: student.id,
    name: student.name,
    email: student.email,
    lrn: student.lrn
  }
}

const loginStudent = async ({ email, password }) => {
  const student = await prisma.student.findUnique({ where: { email } })
  if (!student) throw { status: 404, message: 'Student not found' }

  const match = await bcrypt.compare(password, student.password)
  if (!match) throw { status: 401, message: 'Invalid password' }

  return {
    message: 'Login successful',
    token: generateToken(student, 'student')
  }
}

/**
 * ADMIN
 */
const registerAdmin = async ({ name, email, password }) => {
  const existing = await prisma.admin.findUnique({ where: { email } })
  if (existing) throw { status: 400, message: 'Email already in use' }

  const hashed = await bcrypt.hash(password, 10)

  const admin = await prisma.admin.create({
    data: { name, email, password: hashed }
  })

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email
  }
}

const loginAdmin = async ({ email, password }) => {
  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin) throw { status: 404, message: 'Admin not found' }

  const match = await bcrypt.compare(password, admin.password)
  if (!match) throw { status: 401, message: 'Invalid password' }

  return {
    message: 'Login successful',
    token: generateToken(admin, 'admin')
  }
}

/**
 * PROFILE
 */
const getMe = async ({ id, role }) => {
  const config = roleConfig[role]
  if (!config) throw { status: 400, message: 'Invalid role' }

  const user = await config.model.findUnique({
    where: { id },
    select: config.select
  })

  if (!user) throw { status: 404, message: `${role} not found` }

  return { ...user, role }
}

module.exports = {
  registerTeacher,
  loginTeacher,
  registerStudent,
  loginStudent,
  registerAdmin,
  loginAdmin,
  getMe,
  generateToken
}