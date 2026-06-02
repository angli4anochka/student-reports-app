import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking current database state...\n');

  // Check users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      _count: {
        select: {
          students: true,
          groups: true,
        }
      }
    },
    orderBy: {
      email: 'asc'
    }
  });

  console.log('👥 Users in database:', users.length);
  console.log('='.repeat(80));

  for (const user of users) {
    console.log(`\n📧 ${user.email}`);
    console.log(`   Name: ${user.fullName}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Students: ${user._count.students}`);
    console.log(`   Groups: ${user._count.groups}`);
  }

  console.log('\n' + '='.repeat(80));

  // Check students
  const students = await prisma.student.findMany({
    include: {
      teacher: {
        select: {
          email: true,
          fullName: true,
        }
      },
      group: {
        select: {
          name: true,
        }
      }
    }
  });

  console.log('\n👨‍🎓 Students in database:', students.length);
  console.log('='.repeat(80));

  // Group students by teacher
  const studentsByTeacher: Record<string, any[]> = {};

  for (const student of students) {
    const teacherEmail = student.teacher.email;
    if (!studentsByTeacher[teacherEmail]) {
      studentsByTeacher[teacherEmail] = [];
    }
    studentsByTeacher[teacherEmail].push(student);
  }

  for (const [teacherEmail, teacherStudents] of Object.entries(studentsByTeacher)) {
    console.log(`\n📧 ${teacherEmail} - ${teacherStudents.length} students:`);
    for (const student of teacherStudents) {
      console.log(`   - ${student.fullName} (Group: ${student.group?.name || 'No group'})`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
