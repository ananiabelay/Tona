// src/config/db.js
const { PrismaClient } = require('@prisma/client');

// Initialize the Prisma Client instance
const prisma = new PrismaClient();

module.exports = prisma;