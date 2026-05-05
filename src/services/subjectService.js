const prisma = require('../prisma')

const getAllSubjects = async () => {
  return await prisma.subject.findMany({
    orderBy: { id: 'asc' }
  })
}

module.exports = { getAllSubjects }