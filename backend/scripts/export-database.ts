import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportDatabase() {
  console.log('🚀 Начинаем экспорт базы данных из Supabase...\n');

  const exportData: any = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    tables: {}
  };

  try {
    // 1. Users
    console.log('📥 Экспорт пользователей...');
    exportData.tables.users = await prisma.user.findMany();
    console.log(`✅ Экспортировано пользователей: ${exportData.tables.users.length}`);

    // 2. Groups
    console.log('📥 Экспорт групп...');
    exportData.tables.groups = await prisma.group.findMany();
    console.log(`✅ Экспортировано групп: ${exportData.tables.groups.length}`);

    // 3. GroupTeachers
    console.log('📥 Экспорт связей учителей с группами...');
    exportData.tables.groupTeachers = await prisma.groupTeacher.findMany();
    console.log(`✅ Экспортировано связей: ${exportData.tables.groupTeachers.length}`);

    // 4. Students
    console.log('📥 Экспорт учеников...');
    exportData.tables.students = await prisma.student.findMany();
    console.log(`✅ Экспортировано учеников: ${exportData.tables.students.length}`);

    // 5. Years
    console.log('📥 Экспорт учебных годов...');
    exportData.tables.years = await prisma.year.findMany();
    console.log(`✅ Экспортировано годов: ${exportData.tables.years.length}`);

    // 6. Criteria
    console.log('📥 Экспорт критериев оценивания...');
    exportData.tables.criteria = await prisma.criterion.findMany();
    console.log(`✅ Экспортировано критериев: ${exportData.tables.criteria.length}`);

    // 7. Grades
    console.log('📥 Экспорт оценок...');
    exportData.tables.grades = await prisma.grade.findMany();
    console.log(`✅ Экспортировано оценок: ${exportData.tables.grades.length}`);

    // 8. CriterionGrades
    console.log('📥 Экспорт оценок по критериям...');
    exportData.tables.criterionGrades = await prisma.criterionGrade.findMany();
    console.log(`✅ Экспортировано оценок по критериям: ${exportData.tables.criterionGrades.length}`);

    // 9. Attachments
    console.log('📥 Экспорт вложений...');
    exportData.tables.attachments = await prisma.attachment.findMany();
    console.log(`✅ Экспортировано вложений: ${exportData.tables.attachments.length}`);

    // 10. GradeScales
    console.log('📥 Экспорт шкалы оценок...');
    exportData.tables.gradeScales = await prisma.gradeScale.findMany();
    console.log(`✅ Экспортировано шкал: ${exportData.tables.gradeScales.length}`);

    // 11. Attendance
    console.log('📥 Экспорт посещаемости...');
    exportData.tables.attendance = await prisma.attendance.findMany();
    console.log(`✅ Экспортировано записей посещаемости: ${exportData.tables.attendance.length}`);

    // 12. Lessons
    console.log('📥 Экспорт уроков...');
    exportData.tables.lessons = await prisma.lesson.findMany();
    console.log(`✅ Экспортировано уроков: ${exportData.tables.lessons.length}`);

    // 13. GroupScheduleSettings
    console.log('📥 Экспорт настроек расписания групп...');
    exportData.tables.groupScheduleSettings = await prisma.groupScheduleSettings.findMany();
    console.log(`✅ Экспортировано настроек: ${exportData.tables.groupScheduleSettings.length}`);

    // 14. TeacherSchedules
    console.log('📥 Экспорт расписания учителей...');
    exportData.tables.teacherSchedules = await prisma.teacherSchedule.findMany();
    console.log(`✅ Экспортировано расписаний: ${exportData.tables.teacherSchedules.length}`);

    // Сохранение в файл
    const exportDir = path.join(__dirname, '..', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `database-backup-${timestamp}.json`;
    const filepath = path.join(exportDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2), 'utf-8');

    console.log('\n✅ Экспорт завершён успешно!');
    console.log(`📁 Файл сохранён: ${filepath}`);
    console.log(`📊 Размер файла: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);

    // Статистика
    console.log('\n📊 Статистика экспорта:');
    console.log('─────────────────────────────────');
    Object.entries(exportData.tables).forEach(([table, data]: [string, any]) => {
      console.log(`${table.padEnd(25)} ${data.length} записей`);
    });

  } catch (error) {
    console.error('❌ Ошибка при экспорте:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

exportDatabase()
  .then(() => {
    console.log('\n🎉 Экспорт данных завершён!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
