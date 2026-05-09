/**
 * authService.ts
 */
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import roleConfig from '../../config/roleConfig'

type Role = 'teacher' | 'student'

/**
 * JWT GENERATOR
 * teacher → includes isAdmin
 * student → includes sectionId
 */
const generateToken = (user: any, role: Role): string => {
  const payload: Record<string, unknown> = { id: user.id, role }
  if (role === 'teacher') payload.isAdmin = user.isAdmin ?? false
  if (role === 'student') payload.sectionId = user.sectionId
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '7d' })
}

/**
 * REGISTER
 */
const register = async (role: Role, data: Record<string, any>) => {
  const config = roleConfig[role]
  if (!config) throw { status: 400, message: 'Invalid role' }

  for (const field of config.uniqueFields) {
    const existing = await config.model.findUnique({ where: { [field]: data[field] } })
    if (existing) throw { status: 400, message: `${field} already in use` }
  }

  const hashed = await bcrypt.hash(data.password, 10)
  const payload: Record<string, any> = {}

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
const login = async (role: Role, { email, password }: { email: string; password: string }) => {
  const config = roleConfig[role]
  if (!config) throw { status: 400, message: 'Invalid role' }

  const user = await config.model.findUnique({ where: { email } })
  if (!user) throw { status: 404, message: `${role} not found` }

  const match = await bcrypt.compare(password, user.password)
  if (!match) throw { status: 401, message: 'Invalid password' }

  return {
    message: 'Login successful',
    token: generateToken(user, config.tokenRole as Role)
  }
}

/**
 * PROFILE
 */
const getMe = async ({ id, role }: { id: number; role: Role }) => {
  const config = roleConfig[role]
  if (!config) throw { status: 400, message: 'Invalid role' }

  const user = await config.model.findUnique({ where: { id }, select: config.select })
  if (!user) throw { status: 404, message: `${role} not found` }

  return { ...user, role }
}

export default { register, login, getMe }