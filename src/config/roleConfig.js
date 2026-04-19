/**
 * ROLE CONFIG
 * Single source of truth for all role-based operations.
 * Admin is not a role — it is a privilege flag (isAdmin) on Teacher.
 */
const prisma = require('../prisma')

const roleConfig = {
  teacher: {
    model: prisma.teacher,
    tokenRole: 'teacher',
    uniqueFields: ['email'],
    createFields: ['name', 'email', 'password'],
    select: { id: true, name: true, email: true, isAdmin: true, createdAt: true }
  },
 student: {
  model: prisma.student,
  tokenRole: 'student',
  uniqueFields: ['email', 'lrn'],
  createFields: ['name', 'email', 'password', 'lrn', 'sectionId'],
  select: { id: true, name: true, email: true, lrn: true, xp: true, level: true, sectionId: true, createdAt: true }
}
}

module.exports = roleConfig