/**
 * Auth Middleware
 * 
 * Protects routes that require authentication.
 * Expects a Bearer token in the Authorization header:
 *   Authorization: Bearer <token>
 * 
 * If valid, attaches the decoded user (id, role) to req.user
 * so controllers can access who is making the request.
 * 
 * If invalid or missing, returns 401 Unauthorized.
 */
const jwt = require('jsonwebtoken')

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization

  // Check if Authorization header exists and follows Bearer format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' })
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.split(' ')[1]

  try {
    // Verify token and attach decoded payload to req.user
    // decoded contains: { id, role, iat, exp }
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next() // pass control to the next middleware or controller
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' })
  }
}

module.exports = protect