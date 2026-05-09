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
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthUser {
  id: number
  role: 'teacher' | 'student'
  sectionId?: number
  isAdmin?: boolean
}

// Extend Express Request to include req.user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

const protect = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization

  // Check if Authorization header exists and follows Bearer format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No token provided' })
    return
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.split(' ')[1]

  try {
    // Verify token and attach decoded payload to req.user
    // decoded contains: { id, role, iat, exp }
    // for teachers: also contains { isAdmin }
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as AuthUser
    req.user = decoded
    next()
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' })
  }
}

export default protect

module.exports = protect