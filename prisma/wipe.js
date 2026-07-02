// wipe.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('⏳ Flushing data entries from the database...');
  
  // Wipes all vent entries safely
  const deletedVents = await prisma.vent.deleteMany({});
  console.log(`✅ Successfully cleared ${deletedVents.count} test vents.`);
  
  // OPTIONAL: Uncomment the line below if you want to wipe users too
  // const deletedUsers = await prisma.user.deleteMany({});
  // console.log(`✅ Successfully cleared ${deletedUsers.count} test users.`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());