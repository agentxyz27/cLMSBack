const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const badges = [
    { name: 'First Step', description: 'Complete your first lesson', xpRequired: 10 },
    { name: 'Getting Started', description: 'Reach 50 XP', xpRequired: 50 },
    { name: 'Scholar', description: 'Reach 100 XP', xpRequired: 100 },
    { name: 'Dedicated', description: 'Reach 250 XP', xpRequired: 250 },
    { name: 'Expert', description: 'Reach 500 XP', xpRequired: 500 },
    { name: 'Master', description: 'Reach 1000 XP', xpRequired: 1000 },
  ]

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {},
      create: badge
    })
  }

  console.log('Badges seeded successfully')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())