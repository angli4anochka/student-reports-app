const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const studentId = '215fd611-0a00-497b-b0d9-98f39ff68437';
  const teacherId = '2f2d56ce-8485-4df8-885c-0a9afde8a3df';
  
  // Среда в 10:00
  await prisma.$executeRawUnsafe(
    'INSERT INTO student_schedule_reminders (id, student_id, teacher_id, day_of_week, time, enabled, created_at, updated_at) VALUES (gen_random_uuid()::text, $1, $2, 2, $3, true, NOW(), NOW())',
    studentId,
    teacherId,
    '10:00'
  );
  
  // Пятница в 10:00
  await prisma.$executeRawUnsafe(
    'INSERT INTO student_schedule_reminders (id, student_id, teacher_id, day_of_week, time, enabled, created_at, updated_at) VALUES (gen_random_uuid()::text, $1, $2, 4, $3, true, NOW(), NOW())',
    studentId,
    teacherId,
    '10:00'
  );
  
  console.log('✅ Расписание добавлено для Вики в:');
  console.log('   - Среда в 10:00 (напоминание в 9:00)');
  console.log('   - Пятница в 10:00 (напоминание в 9:00)');
  
  const reminders = await prisma.$queryRawUnsafe(
    'SELECT * FROM student_schedule_reminders WHERE student_id = $1 ORDER BY day_of_week',
    studentId
  );
  console.log('\nВсе расписания Вики:');
  console.log(JSON.stringify(reminders, null, 2));
}

main()
  .catch(e => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
