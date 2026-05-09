/**
 * Prisma Client
 *
 * Single instance of PrismaClient shared across the entire app.
 * Exporting one instance prevents multiple database connections
 * from being created on every request.
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

export default prisma