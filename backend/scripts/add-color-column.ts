import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addColorColumn() {
  try {
    console.log('Adding color column to teacher_schedules table...');

    // Add color column with default value
    await prisma.$executeRawUnsafe(`
      ALTER TABLE teacher_schedules
      ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#FFD700'
    `);

    console.log('✅ Color column added successfully');

    // Add comment
    await prisma.$executeRawUnsafe(`
      COMMENT ON COLUMN teacher_schedules.color IS 'Background color for the schedule cell (hex format)'
    `);

    console.log('✅ Migration completed successfully!');

  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('⚠️  Column already exists, skipping.');
    } else {
      console.error('❌ Error:', error.message || error);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

addColorColumn();
