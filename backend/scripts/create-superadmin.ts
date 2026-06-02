import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    console.log('🔧 Creating superadmin account...');

    const hashedPassword = await bcrypt.hash('Admin2025', 10);

    const superadmin = await prisma.user.upsert({
      where: { email: 'superadmin@system.com' },
      update: {
        password: hashedPassword,
        fullName: 'Супер-Администратор',
        role: 'ADMIN',
        school: null
      },
      create: {
        email: 'superadmin@system.com',
        password: hashedPassword,
        fullName: 'Супер-Администратор',
        role: 'ADMIN',
        school: null
      }
    });

    console.log('✅ Superadmin account created/updated:');
    console.log('   Email:', superadmin.email);
    console.log('   Name:', superadmin.fullName);
    console.log('   Role:', superadmin.role);
    console.log('   School:', superadmin.school || '(none - sees all schools)');
    console.log('\n🔑 Login credentials:');
    console.log('   Email: superadmin@system.com');
    console.log('   Password: Admin2025');
    console.log('\n✨ Superadmin can see ALL data across all schools!');

  } catch (error) {
    console.error('❌ Error creating superadmin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
