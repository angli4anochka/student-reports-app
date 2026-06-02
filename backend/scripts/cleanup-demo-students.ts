import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up demo students created by seed script...\n');

  // Delete students with specific IDs that were created by seed script
  // These IDs contain teacher email patterns
  const demoEmails = [
    'admin1@school1.com',
    'teacher1@school1.com',
    'teacher2@school1.com',
    'admin2@school2.com',
    'teacher3@school2.com',
    'demo@demo.com'
  ];

  let totalDeleted = 0;

  for (const email of demoEmails) {
    const teacher = await prisma.user.findUnique({
      where: { email }
    });

    if (teacher) {
      // Delete students belonging to this demo teacher
      const result = await prisma.student.deleteMany({
        where: {
          teacherId: teacher.id
        }
      });

      console.log(`✅ Deleted ${result.count} students for ${email}`);
      totalDeleted += result.count;

      // Delete groups belonging to this demo teacher
      const groupsResult = await prisma.group.deleteMany({
        where: {
          teacherId: teacher.id
        }
      });
      console.log(`✅ Deleted ${groupsResult.count} groups for ${email}`);
    }
  }

  console.log(`\n✅ Total students cleaned up: ${totalDeleted}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
