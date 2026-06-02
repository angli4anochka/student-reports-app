import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fixing teacher3@school2.com name...\n');

  const before = await prisma.user.findUnique({
    where: { email: 'teacher3@school2.com' }
  });

  console.log('Before:');
  console.log('  Email:', before?.email);
  console.log('  Name:', before?.fullName);

  await prisma.user.update({
    where: { email: 'teacher3@school2.com' },
    data: {
      fullName: 'Новикова Татьяна (Учитель Школы 2)'
    }
  });

  const after = await prisma.user.findUnique({
    where: { email: 'teacher3@school2.com' }
  });

  console.log('\nAfter:');
  console.log('  Email:', after?.email);
  console.log('  Name:', after?.fullName);

  console.log('\n✅ Fixed! teacher3@school2.com is now Новикова Татьяна');

  console.log('\n\nAll School 2 users after fix:');
  const school2Users = await prisma.user.findMany({
    where: { school: 'school2' },
    select: { email: true, fullName: true, role: true },
    orderBy: { email: 'asc' }
  });

  school2Users.forEach(u => {
    console.log(`- ${u.email} → ${u.fullName} (${u.role})`);
  });
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
