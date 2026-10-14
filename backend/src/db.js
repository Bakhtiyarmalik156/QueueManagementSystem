const { PrismaClient } = require('@prisma/client');

// Singleton Prisma client for the app.
const prisma = new PrismaClient();

module.exports = prisma;