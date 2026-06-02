import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdultA1Group() {
  try {
    console.log('🔍 Checking Adult A1 group...\n');

    // Find the group
    const group = await prisma.group.findFirst({
      where: { name: { contains: 'Adult', mode: 'insensitive' } },
      include: {
        teacher: {
          select: { id: true, email: true, fullName: true }
        },
        collaborators: {
          include: {
            teacher: {
              select: { id: true, email: true, fullName: true }
            }
          }
        }
      }
    });

    if (!group) {
      console.log('❌ Group not found');
      return;
    }

    console.log('📚 Group:', group.name);
    console.log('👑 Owner:', group.teacher.email, '-', group.teacher.fullName);
    console.log('\n👥 Collaborators:');

    if (group.collaborators.length === 0) {
      console.log('  No collaborators');
    } else {
      group.collaborators.forEach((collab) => {
        console.log('  -', collab.teacher.email, '-', collab.teacher.fullName);
      });
    }

    // Check lessons in this group
    console.log('\n📝 Lessons in this group:');
    const lessons = await prisma.lesson.findMany({
      where: { groupId: group.id },
      include: {
        teacher: {
          select: { email: true, fullName: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    if (lessons.length === 0) {
      console.log('  No lessons');
    } else {
      lessons.forEach((lesson) => {
        console.log(`  📅 ${lesson.date} - ${lesson.topic}`);
        console.log(`     Created by: ${lesson.teacher.email}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdultA1Group();
