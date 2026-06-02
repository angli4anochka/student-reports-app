import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting demo accounts seeding...');

  // Hash password once for all users
  const password = await bcrypt.hash('demo123', 10);

  // ======================
  // ШКОЛА 1: "Школа №1 Москва"
  // ======================
  console.log('\n📚 Creating School 1: Школа №1 Москва');

  const admin1 = await prisma.user.upsert({
    where: { email: 'admin1@school1.com' },
    update: {},
    create: {
      email: 'admin1@school1.com',
      password: password,
      fullName: 'Иванова Мария (Админ Школы 1)',
      role: 'ADMIN',
    },
  });
  console.log('✅ Created admin1@school1.com');

  const teacher1 = await prisma.user.upsert({
    where: { email: 'teacher1@school1.com' },
    update: {},
    create: {
      email: 'teacher1@school1.com',
      password: password,
      fullName: 'Петрова Елена (Учитель Школы 1)',
      role: 'TEACHER',
    },
  });
  console.log('✅ Created teacher1@school1.com');

  const teacher2 = await prisma.user.upsert({
    where: { email: 'teacher2@school1.com' },
    update: {},
    create: {
      email: 'teacher2@school1.com',
      password: password,
      fullName: 'Сидоров Алексей (Учитель Школы 1)',
      role: 'TEACHER',
    },
  });
  console.log('✅ Created teacher2@school1.com');

  // Create groups for teacher1
  const group1_1 = await prisma.group.upsert({
    where: {
      name_teacherId: {
        name: 'Группа A1',
        teacherId: teacher1.id
      }
    },
    update: {},
    create: {
      name: 'Группа A1',
      description: 'Начинающие',
      teacherId: teacher1.id,
    },
  });

  const group1_2 = await prisma.group.upsert({
    where: {
      name_teacherId: {
        name: 'Группа A2',
        teacherId: teacher1.id
      }
    },
    update: {},
    create: {
      name: 'Группа A2',
      description: 'Продолжающие',
      teacherId: teacher1.id,
    },
  });

  // Create students for teacher1
  const students1 = [
    { name: 'Алексеев Дмитрий', groupId: group1_1.id },
    { name: 'Борисова Анна', groupId: group1_1.id },
    { name: 'Васильев Иван', groupId: group1_1.id },
    { name: 'Григорьева Ольга', groupId: group1_2.id },
    { name: 'Дмитриева Мария', groupId: group1_2.id },
  ];

  for (const student of students1) {
    await prisma.student.upsert({
      where: {
        id: `${teacher1.id}-${student.name}`, // Use composite to avoid duplicates
      },
      update: {},
      create: {
        id: `${teacher1.id}-${student.name}`,
        fullName: student.name,
        teacherId: teacher1.id,
        groupId: student.groupId,
        notes: 'Тестовый ученик для демо',
      },
    });
  }
  console.log(`✅ Created ${students1.length} students for teacher1`);

  // Create groups for teacher2
  const group2_1 = await prisma.group.upsert({
    where: {
      name_teacherId: {
        name: 'Группа B1',
        teacherId: teacher2.id
      }
    },
    update: {},
    create: {
      name: 'Группа B1',
      description: 'Вечерняя группа',
      teacherId: teacher2.id,
    },
  });

  // Create students for teacher2
  const students2 = [
    { name: 'Егоров Петр', groupId: group2_1.id },
    { name: 'Жукова Светлана', groupId: group2_1.id },
    { name: 'Иванов Сергей', groupId: group2_1.id },
  ];

  for (const student of students2) {
    await prisma.student.upsert({
      where: {
        id: `${teacher2.id}-${student.name}`,
      },
      update: {},
      create: {
        id: `${teacher2.id}-${student.name}`,
        fullName: student.name,
        teacherId: teacher2.id,
        groupId: student.groupId,
        notes: 'Тестовый ученик для демо',
      },
    });
  }
  console.log(`✅ Created ${students2.length} students for teacher2`);

  // ======================
  // ШКОЛА 2: "Школа №5 Санкт-Петербург"
  // ======================
  console.log('\n📚 Creating School 2: Школа №5 СПб');

  const admin2 = await prisma.user.upsert({
    where: { email: 'admin2@school2.com' },
    update: {},
    create: {
      email: 'admin2@school2.com',
      password: password,
      fullName: 'Смирнов Андрей (Админ Школы 2)',
      role: 'ADMIN',
    },
  });
  console.log('✅ Created admin2@school2.com');

  const teacher3 = await prisma.user.upsert({
    where: { email: 'teacher3@school2.com' },
    update: {},
    create: {
      email: 'teacher3@school2.com',
      password: password,
      fullName: 'Новикова Татьяна (Учитель Школы 2)',
      role: 'TEACHER',
    },
  });
  console.log('✅ Created teacher3@school2.com');

  // Create groups for teacher3
  const group3_1 = await prisma.group.upsert({
    where: {
      name_teacherId: {
        name: 'Группа С1',
        teacherId: teacher3.id
      }
    },
    update: {},
    create: {
      name: 'Группа С1',
      description: 'Подготовка к экзаменам',
      teacherId: teacher3.id,
    },
  });

  // Create students for teacher3
  const students3 = [
    { name: 'Козлов Владимир', groupId: group3_1.id },
    { name: 'Лебедева Екатерина', groupId: group3_1.id },
    { name: 'Морозов Николай', groupId: group3_1.id },
    { name: 'Никитина Анастасия', groupId: group3_1.id },
  ];

  for (const student of students3) {
    await prisma.student.upsert({
      where: {
        id: `${teacher3.id}-${student.name}`,
      },
      update: {},
      create: {
        id: `${teacher3.id}-${student.name}`,
        fullName: student.name,
        teacherId: teacher3.id,
        groupId: student.groupId,
        notes: 'Тестовый ученик для демо',
      },
    });
  }
  console.log(`✅ Created ${students3.length} students for teacher3`);

  // ======================
  // ДЕМО-АККАУНТ для портфолио
  // ======================
  console.log('\n🎭 Creating DEMO account for portfolio');

  const demo = await prisma.user.upsert({
    where: { email: 'demo@demo.com' },
    update: {},
    create: {
      email: 'demo@demo.com',
      password: password,
      fullName: 'Демо-Аккаунт (Read-Only)',
      role: 'TEACHER',
    },
  });
  console.log('✅ Created demo@demo.com');

  // Create demo group
  const demoGroup = await prisma.group.upsert({
    where: {
      name_teacherId: {
        name: 'Демо-группа',
        teacherId: demo.id
      }
    },
    update: {},
    create: {
      name: 'Демо-группа',
      description: 'Тестовые данные для портфолио',
      teacherId: demo.id,
    },
  });

  // Create demo students
  const demoStudents = [
    'Александров Игорь',
    'Белова Юлия',
    'Викторов Максим',
  ];

  for (const studentName of demoStudents) {
    await prisma.student.upsert({
      where: {
        id: `${demo.id}-${studentName}`,
      },
      update: {},
      create: {
        id: `${demo.id}-${studentName}`,
        fullName: studentName,
        teacherId: demo.id,
        groupId: demoGroup.id,
        notes: 'Демо-ученик',
      },
    });
  }
  console.log(`✅ Created ${demoStudents.length} students for demo`);

  console.log('\n✅ Seeding completed successfully!\n');
  console.log('='.repeat(60));
  console.log('📋 DEMO ACCOUNTS CREATED:');
  console.log('='.repeat(60));
  console.log('\n🏫 ШКОЛА 1:');
  console.log('  Admin:    admin1@school1.com    / demo123');
  console.log('  Teacher:  teacher1@school1.com  / demo123  (5 students)');
  console.log('  Teacher:  teacher2@school1.com  / demo123  (3 students)');
  console.log('\n🏫 ШКОЛА 2:');
  console.log('  Admin:    admin2@school2.com    / demo123');
  console.log('  Teacher:  teacher3@school2.com  / demo123  (4 students)');
  console.log('\n🎭 DEMO (Portfolio):');
  console.log('  Demo:     demo@demo.com         / demo123  (3 students)');
  console.log('\n' + '='.repeat(60));
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
