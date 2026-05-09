/**
 * authController.ts
 */
import { Request, Response } from 'express'
import authService from '../services/authService'

const registerTeacher = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await authService.register('teacher', req.body)
    res.status(201).json({ message: 'Teacher registered', user })
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

const loginTeacher = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.login('teacher', req.body)
    res.json(result)
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

const registerStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await authService.register('student', req.body)
    res.status(201).json({ message: 'Student registered', user })
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

const loginStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.login('student', req.body)
    res.json(result)
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await authService.getMe(req.user as any)
    res.json(user)
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

export { registerTeacher, loginTeacher, registerStudent, loginStudent, getMe }