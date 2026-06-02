import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking admin2@school2.com account...\n');

  const user = await prisma.user.findUnique({
    where: { email: 'admin2@school2.com' },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      school: true,
      password: true
    }
  });

  if (!user) {
    console.log('❌ User NOT FOUND in database!');
    console.log('\nNeed to run: npx ts-node scripts/seed-demo-accounts.ts');
    return;
  }

  console.log('✅ User found in database:');
  console.log('Email:', user.email);
  console.log('Full Name:', user.fullName);
  console.log('Role:', user.role);
  console.log('School:', user.school);
  console.log('Password hash prefix:', user.password.substring(0, 20));

  // Test password
  const testPassword = 'demo123';
  const isValid = await bcrypt.compare(testPassword, user.password);

  console.log('\nPassword test:');
  console.log('Testing password: "demo123"');
  console.log('Result:', isValid ? '✅ VALID' : '❌ INVALID');

  if (!isValid) {
    console.log('\n⚠️ Password does not match! Need to reset password.');
    console.log('\nResetting password to "demo123"...');

    const newHash = await bcrypt.hash('demo123', 10);
    await prisma.user.update({
      where: { email: 'admin2@school2.com' },
      data: { password: newHash }
    });

    console.log('✅ Password reset successfully!');
    console.log('You can now login with: admin2@school2.com / demo123');
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
