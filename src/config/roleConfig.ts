/**
 * roleConfig.ts
 *
 * Single source of truth for all role-based operations.
 * Admin is not a role — it is a privilege flag (isAdmin) on Teacher.
 */
import prisma from '../prisma'

type Role = 'teacher' | 'student'

interface RoleConfig {
  model: any
  tokenRole: Role
  uniqueFields: string[]
  createFields: string[]
  select: Record<string, boolean>
}

const roleConfig: Record<Role, RoleConfig> = {
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

export default roleConfig
