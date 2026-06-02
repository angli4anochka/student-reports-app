import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Resetting all demo account passwords...\n');

  const demoAccounts = [
    { email: 'admin1@school1.com', password: 'demo123' },
    { email: 'admin2@school2.com', password: 'demo123' },
    { email: 'teacher1@school1.com', password: 'demo123' },
    { email: 'teacher2@school1.com', password: 'demo123' },
    { email: 'teacher3@school2.com', password: 'demo123' },
    { email: 'demo@demo.com', password: 'demo123' },
    { email: 'teacher@demo.com', password: 'demo123' },
    { email: 'alina.malakhova@school.com', password: 'Alina2025' },
    { email: 'superadmin@system.com', password: 'Admin2025' },
  ];

  for (const account of demoAccounts) {
    const user = await prisma.user.findUnique({
      where: { email: account.email }
    });

    if (user) {
      const hashedPassword = await bcrypt.hash(account.password, 10);
      await prisma.user.update({
        where: { email: account.email },
        data: { password: hashedPassword }
      });
      console.log(`✅ ${account.email} → ${account.password}`);
    } else {
      console.log(`⚠️  ${account.email} → NOT FOUND (skipped)`);
    }
  }

  console.log('\n✅ All passwords reset successfully!');
  console.log('\n📋 Login credentials:');
  console.log('════════════════════════════════════════');
  console.log('admin1@school1.com / demo123');
  console.log('admin2@school2.com / demo123');
  console.log('teacher1@school1.com / demo123');
  console.log('teacher2@school1.com / demo123');
  console.log('teacher3@school2.com / demo123');
  console.log('demo@demo.com / demo123');
  console.log('teacher@demo.com / demo123');
  console.log('alina.malakhova@school.com / Alina2025');
  console.log('superadmin@system.com / Admin2025');
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
