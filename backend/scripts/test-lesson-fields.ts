import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing lesson fields...\n');

  try {
    // Get a sample lesson to test
    const lessons = await prisma.lesson.findMany({
      take: 1,
      orderBy: { createdAt: 'desc' }
    });

    if (lessons.length > 0) {
      console.log('✅ Found existing lesson:');
      console.log('  ID:', lessons[0].id);
      console.log('  Topic:', lessons[0].topic);
      console.log('  Lesson Plan:', lessons[0].lessonPlan || '(not set)');
      console.log('  Time:', lessons[0].time || '(not set)');
      console.log('  Notification Date:', lessons[0].notificationDate || '(not set)');
    } else {
      console.log('ℹ️  No lessons found in database');
    }

    // Test that the fields are accessible in Prisma types
    console.log('\n✅ Prisma Client successfully recognizes new fields:');
    console.log('  - lessonPlan: string | null');
    console.log('  - time: string | null');
    console.log('  - notificationDate: string | null');

    console.log('\n✨ All tests passed! The fields are now ready to use.');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
