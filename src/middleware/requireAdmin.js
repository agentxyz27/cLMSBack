/**
 * requireAdmin.js
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
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'teacher' || !req.user.isAdmin) {
    return res.status(403).json({ message: 'Access denied — admin privilege required' })
  }
  next()
}

module.exports = requireAdmin