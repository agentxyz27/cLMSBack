/**
 * requireRole.js
 *
 * Role-based access middleware.
 * Used after protect middleware to restrict routes to specific roles.
 *
 * Usage:
 *   router.post('/', protect, requireRole('teacher'), createSubject)
 *
 * req.user.role comes from the decoded JWT — set in protect middleware.
 */
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: 'Access denied — insufficient role' })
    }
    next()
  }
}

module.exports = requireRole