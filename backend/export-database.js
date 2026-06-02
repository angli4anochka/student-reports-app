const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportDatabase() {
  try {
    console.log('🚀 Starting database export...\n');

    const data = {};

    // Export all tables
    console.log('📦 Exporting Users...');
    data.users = await prisma.user.findMany();
    console.log(`   ✓ Exported ${data.users.length} users`);

    console.log('📦 Exporting Groups...');
    data.groups = await prisma.group.findMany();
    console.log(`   ✓ Exported ${data.groups.length} groups`);

    console.log('📦 Exporting GroupTeachers...');
    data.groupTeachers = await prisma.groupTeacher.findMany();
    console.log(`   ✓ Exported ${data.groupTeachers.length} group teachers`);

    console.log('📦 Exporting Students...');
    data.students = await prisma.student.findMany();
    console.log(`   ✓ Exported ${data.students.length} students`);

    console.log('📦 Exporting Years...');
    data.years = await prisma.year.findMany();
    console.log(`   ✓ Exported ${data.years.length} years`);

    console.log('📦 Exporting Criteria...');
    data.criteria = await prisma.criterion.findMany();
    console.log(`   ✓ Exported ${data.criteria.length} criteria`);

    console.log('📦 Exporting Grades...');
    data.grades = await prisma.grade.findMany();
    console.log(`   ✓ Exported ${data.grades.length} grades`);

    console.log('📦 Exporting CriterionGrades...');
    data.criterionGrades = await prisma.criterionGrade.findMany();
    console.log(`   ✓ Exported ${data.criterionGrades.length} criterion grades`);

    console.log('📦 Exporting Lessons...');
    data.lessons = await prisma.lesson.findMany();
    console.log(`   ✓ Exported ${data.lessons.length} lessons`);

    console.log('📦 Exporting Attendance...');
    data.attendance = await prisma.attendance.findMany();
    console.log(`   ✓ Exported ${data.attendance.length} attendance records`);

    console.log('📦 Exporting LessonTypes...');
    data.lessonTypes = await prisma.lessonType.findMany();
    console.log(`   ✓ Exported ${data.lessonTypes.length} lesson types`);

    console.log('📦 Exporting PersonalScheduleSlots...');
    data.personalScheduleSlots = await prisma.personalScheduleSlot.findMany();
    console.log(`   ✓ Exported ${data.personalScheduleSlots.length} schedule slots`);

    console.log('📦 Exporting CompletedLessons...');
    data.completedLessons = await prisma.completedLesson.findMany();
    console.log(`   ✓ Exported ${data.completedLessons.length} completed lessons`);

    console.log('📦 Exporting GlassesGroups...');
    data.glassesGroups = await prisma.glassesGroup.findMany();
    console.log(`   ✓ Exported ${data.glassesGroups.length} glasses groups`);

    console.log('📦 Exporting GlassesStudents...');
    data.glassesStudents = await prisma.glassesStudent.findMany();
    console.log(`   ✓ Exported ${data.glassesStudents.length} glasses students`);

    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, 'database-backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    // Save to JSON file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `database-backup-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    console.log(`\n✅ Database exported successfully!`);
    console.log(`📄 File: ${filepath}`);
    console.log(`📊 Total records: ${Object.values(data).flat().length}`);

    // Also create a readable summary
    const summaryPath = path.join(backupDir, `summary-${timestamp}.txt`);
    const summary = `
DATABASE EXPORT SUMMARY
=======================
Date: ${new Date().toISOString()}

Tables exported:
- Users: ${data.users.length}
- Groups: ${data.groups.length}
- GroupTeachers: ${data.groupTeachers.length}
- Students: ${data.students.length}
- Years: ${data.years.length}
- Criteria: ${data.criteria.length}
- Grades: ${data.grades.length}
- CriterionGrades: ${data.criterionGrades.length}
- Lessons: ${data.lessons.length}
- Attendance: ${data.attendance.length}
- LessonTypes: ${data.lessonTypes.length}
- PersonalScheduleSlots: ${data.personalScheduleSlots.length}
- CompletedLessons: ${data.completedLessons.length}
- GlassesGroups: ${data.glassesGroups.length}
- GlassesStudents: ${data.glassesStudents.length}

TOTAL RECORDS: ${Object.values(data).flat().length}

File: ${filename}
`;

    fs.writeFileSync(summaryPath, summary);
    console.log(`📝 Summary: ${summaryPath}\n`);

  } catch (error) {
    console.error('❌ Error exporting database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

exportDatabase();
