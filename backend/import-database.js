const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importDatabase(jsonFilePath) {
  try {
    console.log('🚀 Starting database import...\n');

    // Read the backup file
    const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

    console.log(`📦 Found ${Object.keys(data).length} tables to import\n`);

    // Import in order to respect foreign key constraints

    // 1. Users (no dependencies)
    console.log('📥 Importing Users...');
    for (const user of data.users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: user,
      });
    }
    console.log(`   ✓ Imported ${data.users.length} users\n`);

    // 2. Groups (depends on nothing)
    console.log('📥 Importing Groups...');
    for (const group of data.groups) {
      await prisma.group.upsert({
        where: { id: group.id },
        update: group,
        create: group,
      });
    }
    console.log(`   ✓ Imported ${data.groups.length} groups\n`);

    // 3. GroupTeachers (depends on Users and Groups)
    console.log('📥 Importing GroupTeachers...');
    for (const gt of data.groupTeachers) {
      await prisma.groupTeacher.upsert({
        where: { id: gt.id },
        update: gt,
        create: gt,
      });
    }
    console.log(`   ✓ Imported ${data.groupTeachers.length} group teachers\n`);

    // 4. Students (depends on Groups and Users)
    console.log('📥 Importing Students...');
    for (const student of data.students) {
      await prisma.student.upsert({
        where: { id: student.id },
        update: student,
        create: student,
      });
    }
    console.log(`   ✓ Imported ${data.students.length} students\n`);

    // 5. Years (no dependencies)
    console.log('📥 Importing Years...');
    for (const year of data.years) {
      await prisma.year.upsert({
        where: { id: year.id },
        update: year,
        create: year,
      });
    }
    console.log(`   ✓ Imported ${data.years.length} years\n`);

    // 6. Criteria (depends on Years and Users)
    console.log('📥 Importing Criteria...');
    for (const criterion of data.criteria) {
      await prisma.criterion.upsert({
        where: { id: criterion.id },
        update: criterion,
        create: criterion,
      });
    }
    console.log(`   ✓ Imported ${data.criteria.length} criteria\n`);

    // 7. Grades (depends on Students, Criteria, Users)
    console.log('📥 Importing Grades...');
    for (const grade of data.grades) {
      await prisma.grade.upsert({
        where: { id: grade.id },
        update: grade,
        create: grade,
      });
    }
    console.log(`   ✓ Imported ${data.grades.length} grades\n`);

    // 8. CriterionGrades (depends on Grades and Criteria)
    console.log('📥 Importing CriterionGrades...');
    for (const cg of data.criterionGrades) {
      await prisma.criterionGrade.upsert({
        where: { id: cg.id },
        update: cg,
        create: cg,
      });
    }
    console.log(`   ✓ Imported ${data.criterionGrades.length} criterion grades\n`);

    // 9. LessonTypes (no dependencies)
    console.log('📥 Importing LessonTypes...');
    for (const lt of data.lessonTypes) {
      await prisma.lessonType.upsert({
        where: { id: lt.id },
        update: lt,
        create: lt,
      });
    }
    console.log(`   ✓ Imported ${data.lessonTypes.length} lesson types\n`);

    // 10. Lessons (depends on Users, Groups, Students)
    console.log('📥 Importing Lessons...');
    for (const lesson of data.lessons) {
      await prisma.lesson.upsert({
        where: { id: lesson.id },
        update: lesson,
        create: lesson,
      });
    }
    console.log(`   ✓ Imported ${data.lessons.length} lessons\n`);

    // 11. Attendance (depends on Lessons and Students)
    console.log('📥 Importing Attendance...');
    for (const attendance of data.attendance) {
      await prisma.attendance.upsert({
        where: { id: attendance.id },
        update: attendance,
        create: attendance,
      });
    }
    console.log(`   ✓ Imported ${data.attendance.length} attendance records\n`);

    // 12. PersonalScheduleSlots (depends on Students and Users)
    console.log('📥 Importing PersonalScheduleSlots...');
    for (const slot of data.personalScheduleSlots) {
      await prisma.personalScheduleSlot.upsert({
        where: { id: slot.id },
        update: slot,
        create: slot,
      });
    }
    console.log(`   ✓ Imported ${data.personalScheduleSlots.length} schedule slots\n`);

    // 13. CompletedLessons (depends on Students, Groups, LessonTypes, Users)
    console.log('📥 Importing CompletedLessons...');
    for (const cl of data.completedLessons) {
      await prisma.completedLesson.upsert({
        where: { id: cl.id },
        update: cl,
        create: cl,
      });
    }
    console.log(`   ✓ Imported ${data.completedLessons.length} completed lessons\n`);

    // 14. GlassesGroups (depends on Groups and Users)
    console.log('📥 Importing GlassesGroups...');
    for (const gg of data.glassesGroups) {
      await prisma.glassesGroup.upsert({
        where: { id: gg.id },
        update: gg,
        create: gg,
      });
    }
    console.log(`   ✓ Imported ${data.glassesGroups.length} glasses groups\n`);

    // 15. GlassesStudents (depends on Students, Groups, Users)
    console.log('📥 Importing GlassesStudents...');
    for (const gs of data.glassesStudents) {
      await prisma.glassesStudent.upsert({
        where: { id: gs.id },
        update: gs,
        create: gs,
      });
    }
    console.log(`   ✓ Imported ${data.glassesStudents.length} glasses students\n`);

    const totalRecords = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
    console.log('✅ Database import completed successfully!');
    console.log(`📊 Total records imported: ${totalRecords}\n`);

  } catch (error) {
    console.error('❌ Error importing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get the backup file path from command line argument
const backupFile = process.argv[2];

if (!backupFile) {
  console.error('❌ Please provide a backup file path');
  console.log('Usage: node import-database.js <path-to-backup.json>');
  process.exit(1);
}

if (!fs.existsSync(backupFile)) {
  console.error(`❌ File not found: ${backupFile}`);
  process.exit(1);
}

importDatabase(backupFile);
