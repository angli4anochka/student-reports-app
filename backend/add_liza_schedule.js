const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const studentId = 'd1e7f608-3c5a-4d81-8cca-d346e29eb2f3'; // Лиза (6 кл)
  const teacherId = '2f2d56ce-8485-4df8-885c-0a9afde8a3df'; // Малахова Алина
  
  // Понедельник в 17:00 (день 0 = Понедельник)
  await prisma.$executeRawUnsafe(
    'INSERT INTO student_schedule_reminders (id, student_id, teacher_id, day_of_week, time, enabled, created_at, updated_at) VALUES (gen_random_uuid()::text, $1, $2, 0, $3, true, NOW(), NOW())',
    studentId,
    teacherId,
    '17:00'
  );
  
  console.log('✅ Расписание добавлено для Лизы (6 кл):');
  console.log('   - Понедельник в 17:00 (напоминание в 9:00)');
  
  const reminders = await prisma.$queryRawUnsafe(
    'SELECT * FROM student_schedule_reminders WHERE student_id = $1 ORDER BY day_of_week',
    studentId
  );
  console.log('\nВсе расписания Лизы:');
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
