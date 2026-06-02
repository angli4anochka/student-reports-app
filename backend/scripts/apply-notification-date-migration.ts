import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add-notification-date-field.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Applying migration: add-notification-date-field.sql');
    console.log('SQL:', migrationSQL);

    // Execute the migration
    await prisma.$executeRawUnsafe(migrationSQL);

    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
