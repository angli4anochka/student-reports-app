import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateEmail() {
  try {
    console.log('Updating email from teacher3@school2.com to angli4anochka@gmail.com...');

    const result = await prisma.user.updateMany({
      where: {
        email: 'teacher3@school2.com'
      },
      data: {
        email: 'angli4anochka@gmail.com'
      }
    });

    console.log(`✅ Updated ${result.count} user(s)`);

    // Verify the update
    const user = await prisma.user.findUnique({
      where: {
        email: 'angli4anochka@gmail.com'
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        school: true
      }
    });

    if (user) {
      console.log('✅ User found with new email:');
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log('❌ User not found after update');
    }

  } catch (error) {
    console.error('❌ Error updating email:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateEmail();
