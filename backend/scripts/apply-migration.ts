import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, '../migrations/add-group-teachers-table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Split SQL into individual commands
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('/*'));

    console.log(`Found ${commands.length} SQL commands to execute...`);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command) {
        console.log(`Executing command ${i + 1}/${commands.length}...`);
        await prisma.$executeRawUnsafe(command);
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('Table "group_teachers" has been created.');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
