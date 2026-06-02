import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default criteria
  const defaultCriteria = [
    { name: '🎭 Граматика / произношение', weight: 0.25, scale: '1-4', order: 1 },
    { name: '🗣 Говорение / общение', weight: 0.25, scale: '1-4', order: 2 },
    { name: '📝 Домашнее задание', weight: 0.25, scale: '1-4', order: 3 },
    { name: '🚀 Вовлечённость и активность', weight: 0.25, scale: '1-4', order: 4 }
  ];


  console.log('Creating default criteria...');
  for (const criterion of defaultCriteria) {
    const existing = await prisma.criterion.findFirst({
      where: { name: criterion.name }
    });
    
    if (!existing) {
      await prisma.criterion.create({
        data: criterion
      });
    }
  }

  // Create default grade scales (adjusted for 1-4 scale)
  const defaultGradeScales = [
    { letter: 'A', minScore: 3.5, description: 'Отлично' },
    { letter: 'B', minScore: 2.5, description: 'Хорошо' },
    { letter: 'C', minScore: 1.5, description: 'Удовлетворительно' },
    { letter: 'D', minScore: 1.0, description: 'Неудовлетворительно' }
  ];

  console.log('Creating default grade scales...');
  for (const scale of defaultGradeScales) {
    const existing = await prisma.gradeScale.findFirst({
      where: { letter: scale.letter }
    });
    
    if (!existing) {
      await prisma.gradeScale.create({
        data: scale
      });
    }
  }

  // Create a demo teacher user
  const hashedPassword = await bcrypt.hash('demo123', 12);
  
  console.log('Creating demo teacher user...');
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@demo.com' },
    update: {},
    create: {
      email: 'teacher@demo.com',
      password: hashedPassword,
      fullName: 'Мария Ивановна Петрова',
      role: 'TEACHER'
    }
  });

  // Create demo academic year
  console.log('Creating demo academic year...');
  const existingYear = await prisma.year.findFirst({
    where: { 
      year: '2024/2025',
      createdBy: teacher.id 
    }
  });
  
  let year;
  if (!existingYear) {
    year = await prisma.year.create({
      data: {
        year: '2024/2025',
        months: JSON.stringify([
          'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь', 
          'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь'
        ]),
        createdBy: teacher.id
      }
    });
  } else {
    year = existingYear;
  }

  console.log('✅ Database seeded successfully!');
  console.log('Demo login credentials:');
  console.log('Email: teacher@demo.com');
  console.log('Password: demo123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });