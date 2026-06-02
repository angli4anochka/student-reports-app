const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const studentId = '9077f74e-cbda-4068-9c93-83a849239f60';
  const teacherId = '2f2d56ce-8485-4df8-885c-0a9afde8a3df';
  
  // Среда в 20:00
  await prisma.$executeRawUnsafe(
    'INSERT INTO student_schedule_reminders (id, student_id, teacher_id, day_of_week, time, enabled, created_at, updated_at) VALUES (gen_random_uuid()::text, $1, $2, 2, $3, true, NOW(), NOW())',
    studentId,
    teacherId,
    '20:00'
  );
  
  // Пятница в 20:00
  await prisma.$executeRawUnsafe(
    'INSERT INTO student_schedule_reminders (id, student_id, teacher_id, day_of_week, time, enabled, created_at, updated_at) VALUES (gen_random_uuid()::text, $1, $2, 4, $3, true, NOW(), NOW())',
    studentId,
    teacherId,
    '20:00'
  );
  
  console.log('✅ Расписание добавлено для Елены (Travel):');
  console.log('   - Среда в 20:00 (напоминание в 9:00)');
  console.log('   - Пятница в 20:00 (напоминание в 9:00)');
  
  const reminders = await prisma.$queryRawUnsafe(
    'SELECT * FROM student_schedule_reminders WHERE student_id = $1 ORDER BY day_of_week',
    studentId
  );
  console.log('\nВсе расписания Елены:');
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
