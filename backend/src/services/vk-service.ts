import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { Request } from 'express';

const prisma = new PrismaClient();

// VK Mini App params interface
interface VKParams {
  vk_user_id?: string;
  vk_app_id?: string;
  vk_is_app_user?: string;
  vk_are_notifications_enabled?: string;
  vk_language?: string;
  vk_ref?: string;
  vk_access_token_settings?: string;
  vk_group_id?: string;
  vk_viewer_group_role?: string;
  vk_platform?: string;
  vk_ts?: string;
  sign?: string;
}

/**
 * Verify VK Mini App signature
 * https://dev.vk.com/ru/mini-apps/development/launch-params#Проверка%20запуска
 */
export function verifyVKLaunchParams(params: VKParams, secretKey: string): boolean {
  const { sign, ...restParams } = params;

  if (!sign) {
    console.error('VK: No signature provided');
    return false;
  }

  // Sort params and create query string
  const orderedParams = Object.keys(restParams)
    .filter(key => key.startsWith('vk_'))
    .sort()
    .map(key => `${key}=${restParams[key as keyof typeof restParams]}`)
    .join('&');

  console.log('VK: Verifying signature with params:', orderedParams);
  console.log('VK: Secret key length:', secretKey.length);

  // Generate hash
  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(orderedParams)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const isValid = hash === sign;

  if (!isValid) {
    console.error('VK: Invalid signature', { expected: hash, received: sign, secretKeyFirst10: secretKey.substring(0, 10) });
  }

  return isValid;
}

/**
 * Extract VK params from query string
 */
export function extractVKParams(req: Request): VKParams {
  const params: VKParams = {};

  // Include all vk_* params from query
  Object.keys(req.query).forEach(key => {
    if (key.startsWith('vk_') || key === 'sign') {
      const value = req.query[key];
      if (value !== undefined) {
        (params as any)[key] = value as string;
      }
    }
  });

  return params;
}

/**
 * Link VK user to student by student ID
 */
export async function linkVKToStudent(vkUserId: string, studentId: string, vkUsername?: string) {
  try {
    const student = await prisma.student.update({
      where: { id: studentId },
      data: {
        vkUserId,
        vkUsername: vkUsername || null,
      },
      select: {
        id: true,
        fullName: true,
        vkUserId: true,
      },
    });

    console.log(`✅ VK user ${vkUserId} linked to student ${student.fullName} (${student.id})`);
    return student;
  } catch (error) {
    console.error('Error linking VK to student:', error);
    throw error;
  }
}

/**
 * Find student by VK user ID
 */
export async function findStudentByVKId(vkUserId: string) {
  try {
    const student = await prisma.student.findFirst({
      where: { vkUserId },
      select: {
        id: true,
        fullName: true,
        vkUserId: true,
        vkUsername: true,
        teacherId: true,
        groupId: true,
        teacher: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return student;
  } catch (error) {
    console.error('Error finding student by VK ID:', error);
    throw error;
  }
}

/**
 * Get homework for student
 */
export async function getStudentHomework(studentId: string, limit = 20) {
  try {
    const lessons = await prisma.lesson.findMany({
      where: {
        OR: [
          { studentId },
          {
            groupId: {
              in: await prisma.student
                .findUnique({ where: { id: studentId }, select: { groupId: true } })
                .then(s => s?.groupId ? [s.groupId] : []),
            },
          },
        ],
        homework: { not: null },
      },
      select: {
        id: true,
        date: true,
        topic: true,
        homework: true,
        comment: true,
        time: true,
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        homeworkSubmissions: {
          where: { studentId },
          select: {
            id: true,
            text: true,
            fileUrl: true,
            fileName: true,
            fileType: true,
            submittedAt: true,
            status: true,
            teacherComment: true,
            grade: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });

    return lessons;
  } catch (error) {
    console.error('Error getting student homework:', error);
    throw error;
  }
}

/**
 * Submit homework
 */
export async function submitHomework(data: {
  lessonId: string;
  studentId: string;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}) {
  try {
    // Check if lesson exists
    const lesson = await prisma.lesson.findUnique({
      where: { id: data.lessonId },
      select: { id: true, homework: true },
    });

    if (!lesson) {
      throw new Error('Lesson not found');
    }

    if (!lesson.homework) {
      throw new Error('This lesson has no homework assignment');
    }

    // Create or update submission
    const submission = await prisma.homeworkSubmission.upsert({
      where: {
        lessonId_studentId: {
          lessonId: data.lessonId,
          studentId: data.studentId,
        },
      },
      create: {
        lessonId: data.lessonId,
        studentId: data.studentId,
        text: data.text,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: data.fileType,
        status: 'SUBMITTED',
      },
      update: {
        text: data.text,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: data.fileType,
        submittedAt: new Date(),
        status: 'SUBMITTED',
      },
      select: {
        id: true,
        submittedAt: true,
        status: true,
      },
    });

    console.log(`✅ Homework submitted for lesson ${data.lessonId} by student ${data.studentId}`);
    return submission;
  } catch (error) {
    console.error('Error submitting homework:', error);
    throw error;
  }
}
