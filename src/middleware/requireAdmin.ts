/**
 * requireAdmin.ts
 *
 * Restricts routes to teachers with admin privileges.
 * Must be used after protect middleware.
 *
 * Checks req.user.isAdmin — set in JWT during login for teachers.
 * Non-teachers and teachers without isAdmin: true will be rejected.
 *
 * Usage:
 *   router.delete('/:id', protect, requireAdmin, deleteUser)
 */
import { Request, Response, NextFunction } from 'express'

const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'teacher' || !req.user.isAdmin) {
    res.status(403).json({ message: 'Access denied — admin privilege required' })
    return
  }
  next()
}

export default requireAdmin

module.exports = requireAdmin