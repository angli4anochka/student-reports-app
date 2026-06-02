import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function renameDemoAccount() {
  try {
    console.log('🔄 Переименование demo@demo.com в teacher@demo.com...');

    const updated = await prisma.user.update({
      where: { email: 'demo@demo.com' },
      data: {
        email: 'teacher@demo.com',
        fullName: 'Демо-Учитель'
      },
      select: { id: true, email: true, fullName: true, role: true, school: true }
    });

    console.log('✅ Аккаунт обновлен:');
    console.log('   Email:', updated.email);
    console.log('   Имя:', updated.fullName);
    console.log('   Роль:', updated.role);
    console.log('   Школа:', updated.school || '(не указана)');
    console.log('\n🔑 Демо-доступ:');
    console.log('   Email: teacher@demo.com');
    console.log('   Пароль: demo123');

  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

renameDemoAccount();
