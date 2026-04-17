/**
 * requireRole.js
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
 *   router.post('/', protect, requireRole(['teacher', 'admin']), createTemplate)
 *
 * req.user.role comes from the decoded JWT — set in protect middleware.
 */
const requireRole = (role) => {
  const allowed = Array.isArray(role) ? role : [role]
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied — insufficient role' })
    }
    next()
  }
}

module.exports = requireRole