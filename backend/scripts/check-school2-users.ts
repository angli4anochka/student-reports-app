import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking School 2 users...\n');

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { school: 'school2' },
        { email: { contains: 'school2.com' } }
      ]
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      school: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log('Found', users.length, 'users:\n');

  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email}`);
    console.log(`   Name: "${user.fullName}"`);
    console.log(`   Role: ${user.role}`);
    console.log(`   School: ${user.school}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log('');
  });

  console.log('Expected data:');
  console.log('- admin2@school2.com → "Смирнов Андрей (Админ Школы 2)" → ADMIN');
  console.log('- teacher3@school2.com → "Новикова Татьяна (Учитель Школы 2)" → TEACHER');
  console.log('- teacher2@school2.com → "Вероника Клюева" → TEACHER (manually created)');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
