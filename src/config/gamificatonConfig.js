/**
 * GAMIFICATION CONFIG
 * Centralized configuration for gamification mechanics (XP, levels, badges)
 */

const gamificationConfig = {
  xp: {
    base: 10,
    bonuses: [
      { minScore: 90, bonus: 10 },
      { minScore: 80, bonus: 5 }
    ]
  },

  level: {
    xpPerLevel: 100
  }
}

module.exports = gamificationConfig