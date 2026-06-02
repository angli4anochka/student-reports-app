import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔄 Applying migrations...\n');

    // Migration 1: lesson_plan and time
    console.log('📄 Migration 1: Add lesson_plan and time fields');
    try {
      await prisma.$executeRaw`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_plan TEXT`;
      console.log('  ✅ Added lesson_plan column');
    } catch (e: any) {
      console.log('  ℹ️  lesson_plan already exists');
    }

    try {
      await prisma.$executeRaw`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS time VARCHAR(255)`;
      console.log('  ✅ Added time column');
    } catch (e: any) {
      console.log('  ℹ️  time already exists');
    }

    // Migration 2: reset_token and reset_token_expiry
    console.log('\n📄 Migration 2: Add password reset fields');
    try {
      await prisma.$executeRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)`;
      console.log('  ✅ Added reset_token column');
    } catch (e: any) {
      console.log('  ℹ️  reset_token already exists');
    }

    try {
      await prisma.$executeRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP`;
      console.log('  ✅ Added reset_token_expiry column');
    } catch (e: any) {
      console.log('  ℹ️  reset_token_expiry already exists');
    }

    try {
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token)`;
      console.log('  ✅ Created index on reset_token');
    } catch (e: any) {
      console.log('  ℹ️  Index already exists');
    }

    // Migration 3: notification_date
    console.log('\n📄 Migration 3: Add notification_date field');
    try {
      await prisma.$executeRaw`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS notification_date VARCHAR(255)`;
      console.log('  ✅ Added notification_date column');
    } catch (e: any) {
      console.log('  ℹ️  notification_date already exists');
    }

    console.log('\n✅ All migrations completed successfully!\n');
  } catch (error) {
    console.error('❌ Error applying migrations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
