/**
 * Database Seed File
 *
 * Seeds initial data required for the system to function.
 * Run this once after setting up the database:
 *   node prisma/seed.js
 *
 * Currently seeds:
 * - Grades (4, 5, 6)
 * - Sections per grade
 * - Subjects (Math unlocked, rest locked)
 * - Topics (Mathematics topics for elementary)
 * - Default badges with XP thresholds
 *
 * Uses upsert to prevent duplicate entries —
 * safe to run multiple times without creating duplicates.
 */
require('dotenv').config()
const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  /**
   * GRADES AND SECTIONS
   * Grades are created first since sections depend on them.
   * Sections are upserted using gradeId + name as the unique identifier.
   */
  const gradeData = [
    { level: 4, sections: ['Ichigo', 'Naruto', 'Luffy'] },
    { level: 5, sections: ['Aizen', 'Pain', 'Kaido'] },
    { level: 6, sections: ['Zanpakuto', 'Chakra', 'Haki'] }
  ]

  for (const { level, sections } of gradeData) {
    const grade = await prisma.grade.upsert({
      where: { level },
      update: {},
      create: { level }
    })

    for (const name of sections) {
      await prisma.section.upsert({
        where: { gradeId_name: { gradeId: grade.id, name } },
        update: {},
        create: { name, gradeId: grade.id }
      })
    }
  }

  console.log('✅ Grades and sections seeded')

  /**
   * SUBJECTS
   * Predetermined by the system — never created by teachers.
   * Only Mathematics is unlocked for the prototype.
   */
  const subjects = [
    { name: 'Mathematics',             description: 'Fundamentals of numeracy and calculation.',     isLocked: false },
    { name: 'Science',                 description: 'Introduced formally from Grade 3 onwards.',     isLocked: true  },
    { name: 'English',                 description: 'Language arts and communication.',              isLocked: true  },
    { name: 'Filipino',                description: 'Language arts and communication.',              isLocked: true  },
    { name: 'Araling Panlipunan',      description: 'History, geography, and culture.',             isLocked: true  },
    { name: 'GMRC / Values Education', description: 'Good Manners and Right Conduct.',              isLocked: true  },
    { name: 'MAPEH',                   description: 'Music, Arts, Physical Education, and Health.', isLocked: true  }
  ]

  for (const subject of subjects) {
    await prisma.subject.upsert({
      where: { name: subject.name },
      update: {},
      create: subject
    })
  }

  console.log('✅ Subjects seeded')

  /**
   * TOPICS — Mathematics (Elementary)
   * These are the measurable skills the 4 engines track.
   * Seeded by dev only — never created by teachers.
   * Each topic is tagged to Mathematics and has no prerequisite by default.
   * Prerequisite chains can be added later as the curriculum matures.
   */
  const mathematics = await prisma.subject.findUnique({
    where: { name: 'Mathematics' }
  })

  const mathTopics = [
    { name: 'Addition' },
    { name: 'Subtraction' },
    { name: 'Multiplication' },
    { name: 'Division' },
    { name: 'Fractions' },
    { name: 'Decimals' },
    { name: 'Geometry' },
    { name: 'Measurement' },
    { name: 'Word Problems' },
    { name: 'Patterns' },
    { name: 'Place Value' },
    { name: 'Time' },
    { name: 'Money' },
    { name: 'Data and Graphs' }
  ]

  for (const topic of mathTopics) {
    await prisma.topic.upsert({
      where: { subjectId_name: { subjectId: mathematics.id, name: topic.name } },
      update: {},
      create: {
        name:      topic.name,
        subjectId: mathematics.id
      }
    })
  }

  console.log('✅ Mathematics topics seeded')

  /**
   * BADGES
   * Default system badges available to all students.
   * xpRequired = minimum total XP a student needs to earn this badge.
   */
  const badges = [
    { name: 'First Step',      description: 'Complete your first lesson', xpRequired: 10   },
    { name: 'Getting Started', description: 'Reach 50 XP',               xpRequired: 50   },
    { name: 'Scholar',         description: 'Reach 100 XP',              xpRequired: 100  },
    { name: 'Dedicated',       description: 'Reach 250 XP',              xpRequired: 250  },
    { name: 'Expert',          description: 'Reach 500 XP',              xpRequired: 500  },
    { name: 'Master',          description: 'Reach 1000 XP',             xpRequired: 1000 }
  ]

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {},
      create: badge
    })
  }

  console.log('✅ Badges seeded')
  console.log('🌱 Seed complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())