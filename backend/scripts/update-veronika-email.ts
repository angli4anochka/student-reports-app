import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const oldEmail = 'teacher2@school2.com';
    const newEmail = 'Kljvveronika@rambler.ru';

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: oldEmail }
    });

    if (!user) {
      console.log(`❌ User with email ${oldEmail} not found`);
      return;
    }

    console.log(`\n📧 Updating email for: ${user.fullName}`);
    console.log(`   Old email: ${oldEmail}`);
    console.log(`   New email: ${newEmail}`);

    // Update the email
    const updated = await prisma.user.update({
      where: { email: oldEmail },
      data: { email: newEmail }
    });

    console.log(`\n✅ Email updated successfully!`);
    console.log(`   User: ${updated.fullName}`);
    console.log(`   New email: ${updated.email}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
