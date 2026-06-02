import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('Applying password reset migration...');

    const migrationPath = path.join(__dirname, '../migrations/add-password-reset-fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 80) + '...');
      await prisma.$executeRawUnsafe(statement);
    }

    console.log('✅ Migration applied successfully!');
    console.log('Running prisma generate...');

  } catch (error) {
    console.error('❌ Error applying migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
