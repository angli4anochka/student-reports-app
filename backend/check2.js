const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM \"_StudentShares\" 
    WHERE (\"A\" = '2f2d56ce-8485-4df8-885c-0a9afde8a3df' AND \"B\" = '3f34d45b-eeae-400d-abcd-ea564edd8e9d')
       OR (\"A\" = '3f34d45b-eeae-400d-abcd-ea564edd8e9d' AND \"B\" = '2f2d56ce-8485-4df8-885c-0a9afde8a3df')
  `;
  console.log('Общих студентов между Алиной и Вероникой:', result[0].count);
  
  const students = await prisma.$queryRaw`
    SELECT s.\"fullName\", u.\"fullName\" as teacher
    FROM \"_StudentShares\" ss
    JOIN \"Student\" s ON s.id = ss.\"A\"
    JOIN \"User\" u ON u.id = s.\"teacherId\"
    WHERE ss.\"B\" IN ('2f2d56ce-8485-4df8-885c-0a9afde8a3df', '3f34d45b-eeae-400d-abcd-ea564edd8e9d')
       OR ss.\"A\" IN ('2f2d56ce-8485-4df8-885c-0a9afde8a3df', '3f34d45b-eeae-400d-abcd-ea564edd8e9d')
  `;
  
  console.log('\nСписок студентов:');
  students.forEach((s, i) => {
    console.log((i+1) + '. ' + s.fullName + ' (учитель: ' + s.teacher + ')');
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
