/**
 * Prisma Client
 * 
 * Single instance of PrismaClient shared across the entire app.
 * Exporting one instance prevents multiple database connections
 * from being created on every request.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

module.exports = prisma