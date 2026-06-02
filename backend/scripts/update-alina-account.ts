import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating teacher@demo.com to Alina Malakhova account...\n');

  // Find the user by old email
  const oldUser = await prisma.user.findUnique({
    where: { email: 'teacher@demo.com' },
    select: {
      id: true,
      email: true,
      fullName: true,
      _count: {
        select: {
          students: true,
          groups: true
        }
      }
    }
  });

  if (!oldUser) {
    console.log('❌ User teacher@demo.com not found!');
    return;
  }

  console.log('📧 Found user:');
  console.log(`   Email: ${oldUser.email}`);
  console.log(`   Name: ${oldUser.fullName}`);
  console.log(`   Students: ${oldUser._count.students}`);
  console.log(`   Groups: ${oldUser._count.groups}`);
  console.log('');

  // Check if new email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: 'alina.malakhova@school.com' }
  });

  if (existingUser) {
    console.log('❌ Email alina.malakhova@school.com already exists!');
    return;
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash('Alina2025', 10);

  // Update the user
  const updatedUser = await prisma.user.update({
    where: { email: 'teacher@demo.com' },
    data: {
      email: 'alina.malakhova@school.com',
      password: hashedPassword,
      fullName: 'Алина Малахова',
      school: 'school1'
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      school: true,
      _count: {
        select: {
          students: true,
          groups: true
        }
      }
    }
  });

  console.log('✅ User updated successfully!\n');
  console.log('📋 New account details:');
  console.log('='.repeat(60));
  console.log(`   Email:    ${updatedUser.email}`);
  console.log(`   Password: Alina2025`);
  console.log(`   Name:     ${updatedUser.fullName}`);
  console.log(`   Role:     ${updatedUser.role}`);
  console.log(`   School:   ${updatedUser.school}`);
  console.log(`   Students: ${updatedUser._count.students}`);
  console.log(`   Groups:   ${updatedUser._count.groups}`);
  console.log('='.repeat(60));
  console.log('\n✅ Алина Малахова теперь может войти с этими данными!');
  console.log('🏫 Администратор admin1@school1.com теперь видит её учеников.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
