/**
 * Database Seed File
 * 
 * Seeds initial data required for the system to function.
 * Run this once after setting up the database:
 *   node prisma/seed.js
 * 
 * Currently seeds:
 * - Default badges with XP thresholds
 * 
 * Uses upsert to prevent duplicate entries —
 * safe to run multiple times without creating duplicates.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  /**
   * Default system badges
   * These are the baseline badges available to all students.
   * Teachers will later be able to create custom badges per subject.
   * 
   * xpRequired = minimum total XP a student needs to earn this badge
   */
  const badges = [
    { name: 'First Step',     description: 'Complete your first lesson', xpRequired: 10   },
    { name: 'Getting Started',description: 'Reach 50 XP',                xpRequired: 50   },
    { name: 'Scholar',        description: 'Reach 100 XP',               xpRequired: 100  },
    { name: 'Dedicated',      description: 'Reach 250 XP',               xpRequired: 250  },
    { name: 'Expert',         description: 'Reach 500 XP',               xpRequired: 500  },
    { name: 'Master',         description: 'Reach 1000 XP',              xpRequired: 1000 },
  ]

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {},   // do nothing if badge already exists
      create: badge // create only if it doesn't exist yet
    })
  }

  console.log('Badges seeded successfully')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect()) // always close DB connection after seeding