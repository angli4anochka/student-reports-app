const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const alinId = '2f2d56ce-8485-4df8-885c-0a9afde8a3df';
  const veronikaId = '3f34d45b-eeae-400d-abcd-ea564edd8e9d';
  
  // Найти группы где Алина - владелец, а Вероника - collaborator
  const alinaOwnsVeronikaShares = await prisma.groupTeacher.findMany({
    where: { teacherId: veronikaId },
    include: {
      group: {
        include: {
          teacher: true,
          _count: { select: { students: true }}
        }
      }
    }
  });
  
  // Найти группы где Вероника - владелец, а Алина - collaborator
  const veronikaOwnsAlinaShares = await prisma.groupTeacher.findMany({
    where: { teacherId: alinId },
    include: {
      group: {
        include: {
          teacher: true,
          _count: { select: { students: true }}
        }
      }
    }
  });
  
  console.log('=== Группы Алины, к которым имеет доступ Вероника ===');
  const alinaGroups = alinaOwnsVeronikaShares.filter(gt => gt.group.teacherId === alinId);
  console.log('Количество:', alinaGroups.length);
  alinaGroups.forEach((gt, i) => {
    console.log((i+1) + '. ' + gt.group.name + ' (студентов: ' + gt.group._count.students + ')');
  });
  
  console.log('\n=== Группы Вероники, к которым имеет доступ Алина ===');
  const veronikaGroups = veronikaOwnsAlinaShares.filter(gt => gt.group.teacherId === veronikaId);
  console.log('Количество:', veronikaGroups.length);
  veronikaGroups.forEach((gt, i) => {
    console.log((i+1) + '. ' + gt.group.name + ' (студентов: ' + gt.group._count.students + ')');
  });
  
  console.log('\nВСЕГО общих групп:', alinaGroups.length + veronikaGroups.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
