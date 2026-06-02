import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function importDatabase(filepath: string) {
  console.log('🚀 Начинаем импорт базы данных в Yandex Cloud...\n');

  if (!fs.existsSync(filepath)) {
    throw new Error(`Файл не найден: ${filepath}`);
  }

  const rawData = fs.readFileSync(filepath, 'utf-8');
  const exportData = JSON.parse(rawData);

  console.log(`📁 Загружен файл: ${filepath}`);
  console.log(`📅 Дата экспорта: ${exportData.exportDate}`);
  console.log(`📊 Версия: ${exportData.version}\n`);

  try {
    // Очистка существующих данных (опционально, закомментировано для безопасности)
    // console.log('🗑️  Очистка существующих данных...');
    // await prisma.$executeRaw`TRUNCATE TABLE ... CASCADE`;

    console.log('📥 Импорт данных...\n');

    // 1. Users (сначала, т.к. от них зависят другие таблицы)
    console.log('📥 Импорт пользователей...');
    for (const user of exportData.tables.users) {
      await prisma.user.create({ data: user });
    }
    console.log(`✅ Импортировано пользователей: ${exportData.tables.users.length}`);

    // 2. Groups
    console.log('📥 Импорт групп...');
    for (const group of exportData.tables.groups) {
      await prisma.group.create({ data: group });
    }
    console.log(`✅ Импортировано групп: ${exportData.tables.groups.length}`);

    // 3. GroupTeachers
    console.log('📥 Импорт связей учителей с группами...');
    for (const gt of exportData.tables.groupTeachers) {
      await prisma.groupTeacher.create({ data: gt });
    }
    console.log(`✅ Импортировано связей: ${exportData.tables.groupTeachers.length}`);

    // 4. Students
    console.log('📥 Импорт учеников...');
    for (const student of exportData.tables.students) {
      await prisma.student.create({ data: student });
    }
    console.log(`✅ Импортировано учеников: ${exportData.tables.students.length}`);

    // 5. Years
    console.log('📥 Импорт учебных годов...');
    for (const year of exportData.tables.years) {
      await prisma.year.create({ data: year });
    }
    console.log(`✅ Импортировано годов: ${exportData.tables.years.length}`);

    // 6. Criteria
    console.log('📥 Импорт критериев оценивания...');
    for (const criterion of exportData.tables.criteria) {
      await prisma.criterion.create({ data: criterion });
    }
    console.log(`✅ Импортировано критериев: ${exportData.tables.criteria.length}`);

    // 7. Grades
    console.log('📥 Импорт оценок...');
    for (const grade of exportData.tables.grades) {
      await prisma.grade.create({ data: grade });
    }
    console.log(`✅ Импортировано оценок: ${exportData.tables.grades.length}`);

    // 8. CriterionGrades
    console.log('📥 Импорт оценок по критериям...');
    for (const cg of exportData.tables.criterionGrades) {
      await prisma.criterionGrade.create({ data: cg });
    }
    console.log(`✅ Импортировано оценок по критериям: ${exportData.tables.criterionGrades.length}`);

    // 9. Attachments
    if (exportData.tables.attachments.length > 0) {
      console.log('📥 Импорт вложений...');
      for (const attachment of exportData.tables.attachments) {
        await prisma.attachment.create({ data: attachment });
      }
      console.log(`✅ Импортировано вложений: ${exportData.tables.attachments.length}`);
    }

    // 10. GradeScales
    if (exportData.tables.gradeScales.length > 0) {
      console.log('📥 Импорт шкалы оценок...');
      for (const scale of exportData.tables.gradeScales) {
        await prisma.gradeScale.create({ data: scale });
      }
      console.log(`✅ Импортировано шкал: ${exportData.tables.gradeScales.length}`);
    }

    // 11. Attendance
    console.log('📥 Импорт посещаемости...');
    for (const att of exportData.tables.attendance) {
      await prisma.attendance.create({ data: att });
    }
    console.log(`✅ Импортировано записей посещаемости: ${exportData.tables.attendance.length}`);

    // 12. Lessons
    console.log('📥 Импорт уроков...');
    for (const lesson of exportData.tables.lessons) {
      await prisma.lesson.create({ data: lesson });
    }
    console.log(`✅ Импортировано уроков: ${exportData.tables.lessons.length}`);

    // 13. GroupScheduleSettings
    console.log('📥 Импорт настроек расписания групп...');
    for (const settings of exportData.tables.groupScheduleSettings) {
      await prisma.groupScheduleSettings.create({ data: settings });
    }
    console.log(`✅ Импортировано настроек: ${exportData.tables.groupScheduleSettings.length}`);

    // 14. TeacherSchedules
    console.log('📥 Импорт расписания учителей...');
    for (const schedule of exportData.tables.teacherSchedules) {
      await prisma.teacherSchedule.create({ data: schedule });
    }
    console.log(`✅ Импортировано расписаний: ${exportData.tables.teacherSchedules.length}`);

    console.log('\n✅ Импорт завершён успешно!');

  } catch (error) {
    console.error('❌ Ошибка при импорте:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

const backupFile = process.argv[2] || path.join(__dirname, '..', 'exports', 'database-backup-2026-01-27.json');

importDatabase(backupFile)
  .then(() => {
    console.log('\n🎉 Импорт данных завершён!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
