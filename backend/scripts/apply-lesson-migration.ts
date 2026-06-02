import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Applying lesson fields migration...');

  try {
    // Add lesson_plan column
    await prisma.$executeRaw`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_plan TEXT`;
    console.log('✅ Added lesson_plan column');

    // Add time column
    await prisma.$executeRaw`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS time VARCHAR(255)`;
    console.log('✅ Added time column');

    // Add notification_date column
    await prisma.$executeRaw`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS notification_date VARCHAR(255)`;
    console.log('✅ Added notification_date column');

    // Verify columns exist
    const columns = await prisma.$queryRaw<Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'lessons'
        AND column_name IN ('lesson_plan', 'time', 'notification_date')
      ORDER BY column_name
    `;

    console.log('\n📋 Verified columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });

    console.log('\n✨ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
