/**
 * authService.js
 */
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const roleConfig = require('../config/roleConfig')

/**
 * JWT GENERATOR
 * teacher → includes isAdmin
 * student → includes sectionId
 */
const generateToken = (user, role) => {
  const payload = { id: user.id, role }
  if (role === 'teacher') payload.isAdmin = user.isAdmin ?? false
  if (role === 'student') payload.sectionId = user.sectionId
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' })
}

/**
 * REGISTER
 */
const register = async (role, data) => {
  const config = roleConfig[role]
  if (!config) throw { status: 400, message: 'Invalid role' }

  for (const field of config.uniqueFields) {
    const existing = await config.model.findUnique({ where: { [field]: data[field] } })
    if (existing) throw { status: 400, message: `${field} already in use` }
  }

  const hashed = await bcrypt.hash(data.password, 10)

  const payload = {}
  for (const field of config.createFields) {
    payload[field] = data[field]
  }
  payload.password = hashed

  // sectionId comes as string from req.body, Prisma expects Int
  if (payload.sectionId) payload.sectionId = parseInt(payload.sectionId)

  const user = await config.model.create({ data: payload })

  return Object.fromEntries(Object.keys(config.select).map(k => [k, user[k]]))
}

/**
 * LOGIN
 */
const login = async (role, { email, password }) => {
  const config = roleConfig[role]
  if (!config) throw { status: 400, message: 'Invalid role' }

  const user = await config.model.findUnique({ where: { email } })
  if (!user) throw { status: 404, message: `${role} not found` }

  const match = await bcrypt.compare(password, user.password)
  if (!match) throw { status: 401, message: 'Invalid password' }

  return {
    message: 'Login successful',
    token: generateToken(user, config.tokenRole)
  }
}

/**
 * PROFILE
 */
const getMe = async ({ id, role }) => {
  const config = roleConfig[role]
  if (!config) throw { status: 400, message: 'Invalid role' }

  const user = await config.model.findUnique({ where: { id }, select: config.select })
  if (!user) throw { status: 404, message: `${role} not found` }

  return { ...user, role }
}

module.exports = { register, login, getMe }