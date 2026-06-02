import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        school: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('\n📋 Все пользователи в системе:\n');
    console.log('='.repeat(80));

    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.fullName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   School: ${user.school || 'не указана'}`);
      console.log(`   Created: ${user.createdAt.toLocaleString('ru-RU')}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\nВсего пользователей: ${users.length}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
