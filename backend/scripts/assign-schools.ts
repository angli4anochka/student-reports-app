import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏫 Assigning schools to demo accounts...\n');

  // School 1
  const school1Users = await prisma.user.updateMany({
    where: {
      email: {
        in: ['admin1@school1.com', 'teacher1@school1.com', 'teacher2@school1.com']
      }
    },
    data: {
      school: 'school1'
    }
  });
  console.log(`✅ Assigned ${school1Users.count} users to school1`);

  // School 2
  const school2Users = await prisma.user.updateMany({
    where: {
      email: {
        in: ['admin2@school2.com', 'teacher3@school2.com']
      }
    },
    data: {
      school: 'school2'
    }
  });
  console.log(`✅ Assigned ${school2Users.count} users to school2`);

  // Demo account
  const demoUsers = await prisma.user.updateMany({
    where: {
      email: 'demo@demo.com'
    },
    data: {
      school: 'demo'
    }
  });
  console.log(`✅ Assigned ${demoUsers.count} users to demo school`);

  console.log('\n✅ School assignments completed!\n');

  // Show summary
  const usersBySchool = await prisma.user.groupBy({
    by: ['school'],
    _count: true
  });

  console.log('📊 Users by school:');
  for (const group of usersBySchool) {
    console.log(`   ${group.school || 'NULL'}: ${group._count} users`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
