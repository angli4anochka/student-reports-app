import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Searching for teacher2@school2.com...\n');

  const user = await prisma.user.findUnique({
    where: { email: 'teacher2@school2.com' }
  });

  if (user) {
    console.log('✅ FOUND in database:');
    console.log(JSON.stringify(user, null, 2));
  } else {
    console.log('❌ NOT FOUND in database!');
    console.log('\nSearching for similar emails...');

    const similar = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'teacher2' } },
          { email: { contains: 'veronika' } },
          { email: { contains: 'klyueva' } },
          { fullName: { contains: 'Вероника' } }
        ]
      }
    });

    if (similar.length > 0) {
      console.log(`\nFound ${similar.length} similar user(s):`);
      similar.forEach(u => {
        console.log(`- ${u.email} → ${u.fullName}`);
      });
    } else {
      console.log('\nNo similar users found.');
    }
  }

  console.log('\n\nAll School 2 users:');
  const school2Users = await prisma.user.findMany({
    where: { school: 'school2' },
    select: { email: true, fullName: true, role: true }
  });

  school2Users.forEach(u => {
    console.log(`- ${u.email} → ${u.fullName} (${u.role})`);
  });
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
