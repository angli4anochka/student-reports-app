import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking all users in database...\n');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      school: true,
      createdAt: true,
      _count: {
        select: {
          students: true,
          groups: true,
        }
      }
    },
    orderBy: {
      email: 'asc'
    }
  });

  console.log(`📊 Total users: ${users.length}\n`);
  console.log('='.repeat(100));

  for (const user of users) {
    console.log(`\n📧 ${user.email}`);
    console.log(`   Name:     ${user.fullName}`);
    console.log(`   Role:     ${user.role}`);
    console.log(`   School:   ${user.school || 'NULL'}`);
    console.log(`   Students: ${user._count.students}`);
    console.log(`   Groups:   ${user._count.groups}`);
    console.log(`   Created:  ${new Date(user.createdAt).toLocaleDateString('ru-RU')}`);
  }

  console.log('\n' + '='.repeat(100));

  // Group by school
  const bySchool: Record<string, number> = {};
  for (const user of users) {
    const school = user.school || 'NULL';
    bySchool[school] = (bySchool[school] || 0) + 1;
  }

  console.log('\n📋 Users by school:');
  for (const [school, count] of Object.entries(bySchool)) {
    console.log(`   ${school}: ${count} users`);
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
