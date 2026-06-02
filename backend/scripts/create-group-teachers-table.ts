import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTable() {
  try {
    console.log('Creating group_teachers table...');

    // Create the table (using TEXT for IDs to match existing schema)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS group_teachers (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        group_id TEXT NOT NULL,
        teacher_id TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        CONSTRAINT fk_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT unique_group_teacher UNIQUE (group_id, teacher_id)
      )
    `);

    console.log('✅ Table created successfully');

    // Create indexes
    console.log('Creating indexes...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_group_teachers_group_id ON group_teachers(group_id)
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_group_teachers_teacher_id ON group_teachers(teacher_id)
    `);

    console.log('✅ Indexes created successfully');

    // Add comment
    await prisma.$executeRawUnsafe(`
      COMMENT ON TABLE group_teachers IS 'Junction table for many-to-many relationship between teachers and groups (for collaborative teaching)'
    `);

    console.log('✅ Migration completed successfully!');
    console.log('Table "group_teachers" is ready to use.');

  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('⚠️  Table already exists, skipping creation.');
    } else {
      console.error('❌ Error:', error.message || error);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTable();
