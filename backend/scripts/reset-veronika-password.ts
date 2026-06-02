import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting password for Kljvveronika@rambler.ru...\n');

  const user = await prisma.user.findUnique({
    where: { email: 'Kljvveronika@rambler.ru' }
  });

  if (!user) {
    console.log('❌ User not found!');
    return;
  }

  console.log('User found:');
  console.log('  Email:', user.email);
  console.log('  Name:', user.fullName);
  console.log('  Role:', user.role);
  console.log('  School:', user.school);

  const newPassword = '123456';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { email: 'Kljvveronika@rambler.ru' },
    data: { password: hashedPassword }
  });

  console.log('\n✅ Password reset successfully!');
  console.log('\n📋 Login credentials:');
  console.log('════════════════════════════════════════');
  console.log('Email: Kljvveronika@rambler.ru');
  console.log('Password: 123456');
  console.log('Name: Вероника Клюева');
  console.log('════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
