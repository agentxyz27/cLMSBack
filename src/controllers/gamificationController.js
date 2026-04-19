/**
 * Gamification Controller
 *
 * Handles XP, leveling, badges, and leaderboard.
 *
 * XP Rules:
 * - Complete a lesson → +10 XP base
 * - Score 80-89%     → +5 bonus XP
 * - Score 90-100%    → +10 bonus XP
 *
 * Level Rules:
 * - Every 100 XP = 1 level up
 *
 * Badge Rules:
 * - Badges are awarded automatically when XP threshold is reached
 */
const prisma = require('../prisma')

/**
 * Calculates XP earned based on score.
 * Base XP is 10, bonus XP for high scores.
 */
const calculateXP = (score) => {
  let xp = 10
  if (score >= 90) xp += 10
  else if (score >= 80) xp += 5
  return xp
}

/**
 * Calculates level based on total XP.
 * Every 100 XP = 1 level.
 */
const calculateLevel = (xp) => {
  return Math.floor(xp / 100) + 1
}

/**
 * Checks and awards badges based on student's current XP.
 * Runs automatically after every lesson completion.
 */
const checkAndAwardBadges = async (studentId, currentXP) => {
  const earnedBadgeIds = await prisma.studentBadge.findMany({
    where: { studentId },
    select: { badgeId: true }
  })

  const earnedIds = earnedBadgeIds.map(b => b.badgeId)

  const newBadges = await prisma.badge.findMany({
    where: {
      xpRequired: { lte: currentXP },
      id: { notIn: earnedIds.length > 0 ? earnedIds : [0] }
    }
  })

  for (const badge of newBadges) {
    await prisma.studentBadge.create({
      data: { studentId, badgeId: badge.id }
    })
  }

  return newBadges
}

/**
 * POST /api/gamification/complete
 * Called when a student completes a lesson.
 * Awards XP, updates level, and checks for new badges.
 */
const completeLesson = async (req, res) => {
  try {
    const { lessonId, score } = req.body
    const studentId = req.user.id

    // Check if already completed
    const existing = await prisma.progress.findFirst({
      where: { studentId, lessonId: parseInt(lessonId) }
    })
    if (existing) {
      return res.status(400).json({ message: 'Lesson already completed' })
    }

    const xpEarned = calculateXP(score || 0)

    // Create progress record
    await prisma.progress.create({
      data: { studentId, lessonId: parseInt(lessonId), completed: true, score, xpEarned }
    })

    // Get current XP then calculate new total cleanly
    const current = await prisma.student.findUnique({
      where: { id: studentId },
      select: { xp: true }
    })

    const newXP = current.xp + xpEarned

    const student = await prisma.student.update({
      where: { id: studentId },
      data: {
        xp: newXP,
        level: calculateLevel(newXP)
      }
    })

    const newBadges = await checkAndAwardBadges(studentId, student.xp)

    res.json({
      message: 'Lesson completed',
      xpEarned,
      totalXP: student.xp,
      level: student.level,
      newBadges: newBadges.length > 0 ? newBadges : []
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * GET /api/gamification/leaderboard
 * Returns top 10 students ranked by XP.
 */
const getLeaderboard = async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      orderBy: { xp: 'desc' },
      take: 10,
      select: { id: true, name: true, xp: true, level: true }
    })
    res.json(students)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * GET /api/gamification/badges
 * Returns all badges earned by the logged-in student.
 */
const getMyBadges = async (req, res) => {
  try {
    const badges = await prisma.studentBadge.findMany({
      where: { studentId: req.user.id },
      include: { badge: true }
    })
    res.json(badges)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { completeLesson, getLeaderboard, getMyBadges }