import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  try {
    const migrationsDir = path.join(__dirname, '..', 'migrations');

    // List of migrations to apply in order
    const migrations = [
      'add-lesson-plan-field.sql',
      'add-password-reset-fields.sql',
      'add-notification-date-field.sql'
    ];

    console.log('🔄 Applying all migrations...\n');

    for (const migrationFile of migrations) {
      const migrationPath = path.join(migrationsDir, migrationFile);

      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️  Migration file not found: ${migrationFile}`);
        continue;
      }

      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

      console.log(`📄 Applying: ${migrationFile}`);

      try {
        await prisma.$executeRawUnsafe(migrationSQL);
        console.log(`✅ Success: ${migrationFile}\n`);
      } catch (error: any) {
        // If column already exists, that's ok
        if (error.message && error.message.includes('already exists')) {
          console.log(`ℹ️  Already applied: ${migrationFile}\n`);
        } else {
          console.error(`❌ Error in ${migrationFile}:`, error.message);
          throw error;
        }
      }
    }

    console.log('✅ All migrations applied successfully!\n');
  } catch (error) {
    console.error('❌ Error applying migrations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
