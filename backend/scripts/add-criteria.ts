import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addCriteria() {
  try {
    console.log('Adding default criteria...');

    const criteria = [
      { name: 'Активность на уроке', weight: 1, scale: '1-4', order: 1 },
      { name: 'Вовлечённость', weight: 1, scale: '1-4', order: 2 },
      { name: 'Выполнение д/з', weight: 1, scale: '1-4', order: 3 },
      { name: 'Чтение', weight: 1, scale: '1-4', order: 4 },
      { name: 'Грамматика', weight: 1, scale: '1-4', order: 5 },
      { name: 'Говорение', weight: 1, scale: '1-4', order: 6 },
    ];

    for (const criterion of criteria) {
      const existing = await prisma.criterion.findFirst({
        where: { name: criterion.name }
      });

      if (!existing) {
        await prisma.criterion.create({ data: criterion });
        console.log(`✓ Created: ${criterion.name}`);
      } else {
        console.log(`- Already exists: ${criterion.name}`);
      }
    }

    console.log('\nDone! Criteria added successfully.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addCriteria();
