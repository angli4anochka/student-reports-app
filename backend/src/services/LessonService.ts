import { PrismaClient, Lesson } from '@prisma/client';
import { randomUUID } from 'crypto';
import { sendHomeworkToStudent, sendHomeworkToGroup } from './telegram-bot';

const prisma = new PrismaClient();

export interface LessonWithRelations extends Lesson {
  group?: { id: string; name: string; description?: string };
  student?: { id: string; fullName: string };
}

export interface LessonFilters {
  userId: string;
  groupId?: string;
  studentId?: string;
}

export interface CreateLessonData {
  date: Date | string;
  topic: string;
  homework?: string;
  comment?: string;
  groupId?: string | null;
  studentId?: string | null;
  scheduleSlotId?: string | null;
  teacherId: string;
  time?: string;
  notificationDate?: Date | string;
  lessonPlan?: string;
}

export interface UpdateLessonData {
  date?: Date | string;
  topic?: string;
  homework?: string;
  comment?: string;
  groupId?: string | null;
  studentId?: string | null;
  time?: string;
  notificationDate?: Date | string;
  lessonPlan?: string;
}

export class LessonService {
  /**
   * Get all lessons based on user permissions and filters
   */
  static async getLessons(filters: LessonFilters): Promise<LessonWithRelations[]> {
    const { userId, groupId, studentId } = filters;

    // Get current user for organization check
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, role: true }
    });

    if (!currentUser) {
      throw new Error('User not found');
    }

    let lessons;

    // Filter by specific student
    if (studentId) {
      if (currentUser.organizationId) {
        // Organization user - see all organization student lessons
        lessons = await prisma.$queryRaw`
          SELECT l.*,
                 CASE WHEN g.id IS NOT NULL THEN jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description) ELSE NULL END as group,
                 CASE WHEN st.id IS NOT NULL THEN jsonb_build_object('id', st.id, 'fullName', st."fullName") ELSE NULL END as student
          FROM lessons l
          LEFT JOIN groups g ON l."groupId" = g.id
          LEFT JOIN students st ON l."studentId" = st.id
          WHERE l."studentId" = ${studentId}
            AND l."organizationId" = ${currentUser.organizationId}
          ORDER BY l.date DESC
        `;
      } else {
        // Individual tutor - only own lessons
        lessons = await prisma.$queryRaw`
          SELECT l.*,
                 CASE WHEN g.id IS NOT NULL THEN jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description) ELSE NULL END as group,
                 CASE WHEN st.id IS NOT NULL THEN jsonb_build_object('id', st.id, 'fullName', st."fullName") ELSE NULL END as student
          FROM lessons l
          LEFT JOIN groups g ON l."groupId" = g.id
          LEFT JOIN students st ON l."studentId" = st.id
          WHERE l."teacherId" = ${userId} AND l."studentId" = ${studentId}
          ORDER BY l.date DESC
        `;
      }
    }
    // Filter by specific group
    else if (groupId) {
      if (currentUser.organizationId) {
        // Organization user - see all organization group lessons
        lessons = await prisma.$queryRaw`
          SELECT l.*,
                 CASE WHEN g.id IS NOT NULL THEN jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description) ELSE NULL END as group,
                 CASE WHEN st.id IS NOT NULL THEN jsonb_build_object('id', st.id, 'fullName', st."fullName") ELSE NULL END as student
          FROM lessons l
          LEFT JOIN groups g ON l."groupId" = g.id
          LEFT JOIN students st ON l."studentId" = st.id
          WHERE l."groupId" = ${groupId}
            AND l."organizationId" = ${currentUser.organizationId}
          ORDER BY l.date DESC
        `;
      } else {
        // Individual tutor - only lessons with access
        lessons = await prisma.$queryRaw`
          SELECT l.*,
                 CASE WHEN g.id IS NOT NULL THEN jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description) ELSE NULL END as group,
                 CASE WHEN st.id IS NOT NULL THEN jsonb_build_object('id', st.id, 'fullName', st."fullName") ELSE NULL END as student
          FROM lessons l
          LEFT JOIN groups g ON l."groupId" = g.id
          LEFT JOIN students st ON l."studentId" = st.id
          WHERE l."groupId" = ${groupId}
            AND (l."teacherId" = ${userId} OR l."groupId" IN (
              SELECT "groupId" FROM group_teachers WHERE "teacher_id" = ${userId}
            ))
          ORDER BY l.date DESC
        `;
      }
    }
    // Get all lessons
    else {
      if (currentUser.organizationId) {
        // Organization user - all organization lessons
        lessons = await prisma.$queryRaw`
          SELECT l.*,
                 CASE WHEN g.id IS NOT NULL THEN jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description) ELSE NULL END as group,
                 CASE WHEN st.id IS NOT NULL THEN jsonb_build_object('id', st.id, 'fullName', st."fullName") ELSE NULL END as student
          FROM lessons l
          LEFT JOIN groups g ON l."groupId" = g.id
          LEFT JOIN students st ON l."studentId" = st.id
          WHERE l."organizationId"::text = ${currentUser.organizationId}
          ORDER BY l.date DESC
        `;
      } else {
        // Individual tutor - own lessons + shared groups
        lessons = await prisma.$queryRaw`
          SELECT l.*,
                 CASE WHEN g.id IS NOT NULL THEN jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description) ELSE NULL END as group,
                 CASE WHEN st.id IS NOT NULL THEN jsonb_build_object('id', st.id, 'fullName', st."fullName") ELSE NULL END as student
          FROM lessons l
          LEFT JOIN groups g ON l."groupId" = g.id
          LEFT JOIN students st ON l."studentId" = st.id
          WHERE l."teacherId" = ${userId}
             OR l."groupId" IN (
               SELECT DISTINCT "groupId" FROM personal_schedule_slots
               WHERE "teacherId" = ${userId} AND "groupId" IS NOT NULL
             )
          ORDER BY l.date DESC
        `;
      }
    }

    return lessons as LessonWithRelations[];
  }

  /**
   * Get single lesson by ID with access check
   */
  static async getLessonById(
    lessonId: string,
    userId: string
  ): Promise<LessonWithRelations | null> {
    // Get current user for organization check
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, role: true }
    });

    if (!currentUser) {
      return null;
    }

    // Check access permissions
    let lessonCheck;
    if (currentUser.organizationId) {
      if (currentUser.role === 'ADMIN' || currentUser.role === 'SCHOOL_MANAGER') {
        // Admin sees only non-personal student lessons
        lessonCheck = await prisma.lesson.findFirst({
          where: {
            id: lessonId,
            organizationId: currentUser.organizationId,
            student: { isPersonal: false }
          }
        });
      } else {
        // Teachers see: own + shared + organization non-personal students
        lessonCheck = await prisma.lesson.findFirst({
          where: {
            id: lessonId,
            OR: [
              { teacherId: userId },
              { group: { collaborators: { some: { teacherId: userId } } } },
              { student: { sharedTeachers: { some: { teacherId: userId } } } },
              { student: { organizationId: currentUser.organizationId, isPersonal: false } }
            ]
          }
        });
      }
    } else {
      // Individual tutor - only own or shared lessons
      lessonCheck = await prisma.lesson.findFirst({
        where: {
          id: lessonId,
          OR: [
            { teacherId: userId },
            { group: { collaborators: { some: { teacherId: userId } } } },
            { student: { sharedTeachers: { some: { teacherId: userId } } } }
          ]
        }
      });
    }

    if (!lessonCheck) {
      return null;
    }

    const lesson = await prisma.$queryRaw`
      SELECT l.*,
             CASE WHEN g.id IS NOT NULL THEN jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description) ELSE NULL END as group,
             CASE WHEN st.id IS NOT NULL THEN jsonb_build_object('id', st.id, 'fullName', st."fullName") ELSE NULL END as student
      FROM lessons l
      LEFT JOIN groups g ON l."groupId" = g.id
      LEFT JOIN students st ON l."studentId" = st.id
      WHERE l.id = ${lessonId}
    `;

    if (!lesson || (lesson as any[]).length === 0) {
      return null;
    }

    return (lesson as any[])[0] as LessonWithRelations;
  }

  /**
   * Create new lesson
   */
  static async createLesson(data: CreateLessonData): Promise<LessonWithRelations> {
    const lessonId = randomUUID();
    const finalGroupId = data.groupId && data.groupId !== '' ? data.groupId : null;
    const finalStudentId = data.studentId && data.studentId !== '' ? data.studentId : null;
    const finalSlotId = data.scheduleSlotId && data.scheduleSlotId !== '' ? data.scheduleSlotId : null;

    await prisma.$executeRaw`
      INSERT INTO lessons (id, date, topic, homework, comment, "teacherId", "groupId", "studentId", "scheduleSlotId", "createdAt", "updatedAt")
      VALUES (${lessonId}, ${data.date}, ${data.topic}, ${data.homework || ''}, ${data.comment || ''}, ${data.teacherId}, ${finalGroupId}, ${finalStudentId}, ${finalSlotId}, NOW(), NOW())
    `;

    const lesson = await prisma.$queryRaw`
      SELECT l.*,
             CASE WHEN g.id IS NOT NULL THEN jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description) ELSE NULL END as group,
             CASE WHEN st.id IS NOT NULL THEN jsonb_build_object('id', st.id, 'fullName', st."fullName") ELSE NULL END as student
      FROM lessons l
      LEFT JOIN groups g ON l."groupId" = g.id
      LEFT JOIN students st ON l."studentId" = st.id
      WHERE l.id = ${lessonId}
    `;

    // Автоотправка в Telegram отключена
    // Используйте /api/telegram/send для ручной отправки ДЗ
    // if (data.homework && data.homework.trim() !== '') {
    //   const homeworkData = {
    //     date: data.date,
    //     topic: data.topic,
    //     homework: data.homework
    //   };
    //
    //   // Send to individual student
    //   if (finalStudentId) {
    //     sendHomeworkToStudent(finalStudentId, homeworkData).catch(err => {
    //       console.error('Error sending homework to student via Telegram:', err);
    //     });
    //   }
    //
    //   // Send to group
    //   if (finalGroupId) {
    //     sendHomeworkToGroup(finalGroupId, homeworkData).catch(err => {
    //       console.error('Error sending homework to group via Telegram:', err);
    //     });
    //   }
    // }

    return (lesson as any[])[0] as LessonWithRelations;
  }

  /**
   * Update lesson (with access check)
   */
  static async updateLesson(
    lessonId: string,
    data: UpdateLessonData,
    userId: string
  ): Promise<LessonWithRelations | null> {
    const finalGroupId = data.groupId && data.groupId !== '' ? data.groupId : null;
    const finalStudentId = data.studentId && data.studentId !== '' ? data.studentId : null;

    // Get current user for organization check
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, role: true }
    });

    if (!currentUser) {
      return null;
    }

    // Check access permissions
    let lessonCheck;
    if (currentUser.organizationId) {
      // Organization user - can edit any organization lessons
      lessonCheck = await prisma.lesson.findFirst({
        where: {
          id: lessonId,
          organizationId: currentUser.organizationId
        }
      });
    } else {
      // Individual tutor - only own or shared lessons
      lessonCheck = await prisma.lesson.findFirst({
        where: {
          id: lessonId,
          OR: [
            { teacherId: userId },
            { group: { collaborators: { some: { teacherId: userId } } } },
            { student: { sharedTeachers: { some: { teacherId: userId } } } }
          ]
        }
      });
    }

    if (!lessonCheck) {
      return null;
    }

    await prisma.$executeRaw`
      UPDATE lessons
      SET date = ${data.date}, topic = ${data.topic}, homework = ${data.homework}, comment = ${data.comment},
          "groupId" = ${finalGroupId}, "studentId" = ${finalStudentId}, "updatedAt" = NOW()
      WHERE id = ${lessonId}
    `;

    const lesson = await prisma.$queryRaw`
      SELECT l.*,
             CASE WHEN g.id IS NOT NULL THEN jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description) ELSE NULL END as group,
             CASE WHEN st.id IS NOT NULL THEN jsonb_build_object('id', st.id, 'fullName', st."fullName") ELSE NULL END as student
      FROM lessons l
      LEFT JOIN groups g ON l."groupId" = g.id
      LEFT JOIN students st ON l."studentId" = st.id
      WHERE l.id = ${lessonId}
    `;

    // Автоотправка в Telegram отключена
    // Используйте /api/telegram/send для ручной отправки ДЗ
    // if (data.homework && data.homework.trim() !== '') {
    //   const homeworkData = {
    //     date: data.date,
    //     topic: data.topic,
    //     homework: data.homework
    //   };
    //
    //   // Send to individual student
    //   if (finalStudentId) {
    //     sendHomeworkToStudent(finalStudentId, homeworkData).catch(err => {
    //       console.error('Error sending homework to student via Telegram:', err);
    //     });
    //   }
    //
    //   // Send to group
    //   if (finalGroupId) {
    //     sendHomeworkToGroup(finalGroupId, homeworkData).catch(err => {
    //       console.error('Error sending homework to group via Telegram:', err);
    //     });
    //   }
    // }

    return (lesson as any[])[0] as LessonWithRelations;
  }

  /**
   * Delete lesson (owner only)
   */
  static async deleteLesson(lessonId: string, userId: string): Promise<boolean> {
    // Only owner can delete
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        teacherId: userId
      }
    });

    if (!lesson) {
      return false;
    }

    await prisma.$executeRaw`DELETE FROM lessons WHERE id = ${lessonId}`;
    return true;
  }

  /**
   * Check if user has access to lesson (read permission)
   */
  static async checkLessonAccess(lessonId: string, userId: string): Promise<boolean> {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, role: true }
    });

    if (!currentUser) {
      return false;
    }

    let lessonCheck;
    if (currentUser.organizationId) {
      if (currentUser.role === 'ADMIN' || currentUser.role === 'SCHOOL_MANAGER') {
        lessonCheck = await prisma.lesson.findFirst({
          where: {
            id: lessonId,
            organizationId: currentUser.organizationId,
            student: { isPersonal: false }
          }
        });
      } else {
        lessonCheck = await prisma.lesson.findFirst({
          where: {
            id: lessonId,
            OR: [
              { teacherId: userId },
              { group: { collaborators: { some: { teacherId: userId } } } },
              { student: { sharedTeachers: { some: { teacherId: userId } } } },
              { student: { organizationId: currentUser.organizationId, isPersonal: false } }
            ]
          }
        });
      }
    } else {
      lessonCheck = await prisma.lesson.findFirst({
        where: {
          id: lessonId,
          OR: [
            { teacherId: userId },
            { group: { collaborators: { some: { teacherId: userId } } } },
            { student: { sharedTeachers: { some: { teacherId: userId } } } }
          ]
        }
      });
    }

    return lessonCheck !== null;
  }
}
