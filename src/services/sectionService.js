/**
 * sectionService.js
 *
 * Handles section-related business logic.
 */
const prisma = require('../prisma')

const getAllSections = async () => {
  return await prisma.grade.findMany({
    orderBy: { level: 'asc' },
    select: {
      id: true,
      level: true,
      sections: {
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
      }
    }
  })
}

module.exports = { getAllSections }