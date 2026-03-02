/**
 * Prisma Client
 * 
 * Single instance of PrismaClient shared across the entire app.
 * Exporting one instance prevents multiple database connections
 * from being created on every request.
 */

const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

module.exports = prisma