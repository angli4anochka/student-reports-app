import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('Checking database...\n');

    // Check grades
    const grades = await prisma.grade.findMany({
      take: 5,
      include: {
        student: true,
        criteriaGrades: {
          include: {
            criterion: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    console.log(`Found ${grades.length} recent grades:\n`);

    grades.forEach((grade, index) => {
      console.log(`Grade ${index + 1}:`);
      console.log(`  Student: ${grade.student.fullName}`);
      console.log(`  Month: ${grade.month}`);
      console.log(`  Comment: ${grade.comment || 'N/A'}`);
      console.log(`  Criteria Grades: ${grade.criteriaGrades.length}`);

      grade.criteriaGrades.forEach((cg) => {
        console.log(`    - ${cg.criterion.name}: ${cg.value}`);
      });
      console.log('');
    });

    // Check specific student
    const studentId = '84d36906-5620-45f5-a158-4114d8238acb';
    const studentGrade = await prisma.grade.findFirst({
      where: {
        studentId: studentId,
        month: 'Сентябрь'
      },
      include: {
        student: true,
        criteriaGrades: {
          include: {
            criterion: true
          }
        }
      }
    });

    if (studentGrade) {
      console.log('Grade for Кузьмина Александра (September):');
      console.log(`  Comment: ${studentGrade.comment || 'N/A'}`);
      console.log(`  Criteria Grades: ${studentGrade.criteriaGrades.length}`);
      studentGrade.criteriaGrades.forEach((cg) => {
        console.log(`    - ${cg.criterion.name}: ${cg.value}`);
      });
    } else {
      console.log('No grade found for Кузьмина Александра in September');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
