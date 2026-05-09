/**
 * requireRole.ts
 *
 * Role-based access middleware.
 * Used after protect middleware to restrict routes to specific roles.
 *
 * Accepts a single role string or an array of roles.
 *
 * Usage (single role):
 *   router.post('/', protect, requireRole('teacher'), createSubject)
 *
 * Usage (multiple roles):
 *   router.post('/', protect, requireRole(['teacher']), createTemplate)
 *
 * req.user.role comes from the decoded JWT — set in protect middleware.
 */
import { Request, Response, NextFunction } from 'express'
import { AuthUser } from './auth'

const requireRole = (role: AuthUser['role'] | AuthUser['role'][]) => {
  const allowed = Array.isArray(role) ? role : [role]

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowed.includes(req.user.role)) {
      res.status(403).json({ message: 'Access denied — insufficient role' })
      return
    }
    next()
  }
}

export default requireRole

module.exports = requireRole