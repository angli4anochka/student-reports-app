const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const alina = await prisma.user.findUnique({ where: { email: 'angli4anochka@gmail.com' }});
  const veronika = await prisma.user.findUnique({ where: { email: 'Kljvveronika@rambler.ru' }});
  
  if (!alina || !veronika) {
    console.log('Пользователи не найдены');
    return;
  }
  
  console.log('Алина ID:', alina.id);
  console.log('Вероника ID:', veronika.id);
  console.log('---');
  
  const shares = await prisma.studentShare.findMany({
    where: {
      OR: [
        { sharedById: alina.id, sharedWithId: veronika.id },
        { sharedById: veronika.id, sharedWithId: alina.id }
      ]
    },
    include: {
      student: { include: { teacher: true }},
      sharedBy: true,
      sharedWith: true
    }
  });
  
  console.log('Найдено общих студентов:', shares.length);
  shares.forEach((s, i) => {
    console.log((i+1) + '. ' + s.student.fullName + ' (владелец: ' + s.student.teacher.fullName + ')');
    console.log('   ' + s.sharedBy.fullName + ' -> ' + s.sharedWith.fullName);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
