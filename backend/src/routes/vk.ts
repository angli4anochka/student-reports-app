import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  verifyVKLaunchParams,
  extractVKParams,
  linkVKToStudent,
  findStudentByVKId,
  getStudentHomework,
  submitHomework,
} from '../services/vk-service';

const router = express.Router();
const prisma = new PrismaClient();

const VK_SECRET_KEY = process.env.VK_SECRET_KEY || '';

if (!VK_SECRET_KEY) {
  console.warn('⚠️  VK_SECRET_KEY not set in environment variables');
}

/**
 * Middleware to verify VK launch params
 */
function verifyVK(req: Request, res: Response, next: () => void) {
  const vkParams = extractVKParams(req);

  if (!VK_SECRET_KEY) {
    return res.status(500).json({ error: 'VK integration not configured' });
  }

  const isValid = verifyVKLaunchParams(vkParams, VK_SECRET_KEY);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid VK signature' });
  }

  // Attach VK user ID to request
  (req as any).vkUserId = vkParams.vk_user_id;
  next();
}

/**
 * POST /api/vk/auth
 * Authenticate VK user and check if linked to student
 */
router.post('/auth', verifyVK, async (req: Request, res: Response) => {
  try {
    const vkUserId = (req as any).vkUserId;

    if (!vkUserId) {
      return res.status(400).json({ error: 'VK user ID not found' });
    }

    // Find student by VK ID
    const student = await findStudentByVKId(vkUserId);

    if (!student) {
      return res.status(404).json({
        error: 'Student not linked',
        message: 'Ваш VK аккаунт не привязан к студенту. Получите Student ID у преподавателя.',
        vkUserId,
      });
    }

    res.json({
      success: true,
      student: {
        id: student.id,
        fullName: student.fullName,
        vkUserId: student.vkUserId,
        teacher: student.teacher,
        group: student.group,
      },
    });
  } catch (error) {
    console.error('VK auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * POST /api/vk/link
 * Link VK user to student by student ID
 */
router.post('/link', verifyVK, async (req: Request, res: Response) => {
  try {
    const vkUserId = (req as any).vkUserId;
    const { studentId, vkUsername } = req.body;

    if (!vkUserId) {
      return res.status(400).json({ error: 'VK user ID not found' });
    }

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID required' });
    }

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, fullName: true, vkUserId: true },
    });

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (existingStudent.vkUserId && existingStudent.vkUserId !== vkUserId) {
      return res.status(400).json({
        error: 'Student already linked to another VK account',
      });
    }

    // Link VK to student
    const student = await linkVKToStudent(vkUserId, studentId, vkUsername);

    res.json({
      success: true,
      message: `VK аккаунт успешно привязан к студенту ${student.fullName}`,
      student: {
        id: student.id,
        fullName: student.fullName,
        vkUserId: student.vkUserId,
      },
    });
  } catch (error) {
    console.error('VK link error:', error);
    res.status(500).json({ error: 'Linking failed' });
  }
});

/**
 * GET /api/vk/homework
 * Get homework assignments for authenticated student
 */
router.get('/homework', verifyVK, async (req: Request, res: Response) => {
  try {
    const vkUserId = (req as any).vkUserId;

    if (!vkUserId) {
      return res.status(400).json({ error: 'VK user ID not found' });
    }

    // Find student by VK ID
    const student = await findStudentByVKId(vkUserId);

    if (!student) {
      return res.status(404).json({ error: 'Student not linked' });
    }

    // Get homework
    const homework = await getStudentHomework(student.id);

    res.json({
      success: true,
      homework,
      student: {
        id: student.id,
        fullName: student.fullName,
      },
    });
  } catch (error) {
    console.error('Get homework error:', error);
    res.status(500).json({ error: 'Failed to get homework' });
  }
});

/**
 * POST /api/vk/homework/:lessonId/submit
 * Submit homework for a lesson
 */
router.post('/homework/:lessonId/submit', verifyVK, async (req: Request, res: Response) => {
  try {
    const vkUserId = (req as any).vkUserId;
    const { lessonId } = req.params;
    const { text, fileUrl, fileName, fileType } = req.body;

    if (!vkUserId) {
      return res.status(400).json({ error: 'VK user ID not found' });
    }

    // Find student by VK ID
    const student = await findStudentByVKId(vkUserId);

    if (!student) {
      return res.status(404).json({ error: 'Student not linked' });
    }

    // Validate submission data
    if (!text && !fileUrl) {
      return res.status(400).json({ error: 'Text or file required' });
    }

    // Submit homework
    const submission = await submitHomework({
      lessonId,
      studentId: student.id,
      text,
      fileUrl,
      fileName,
      fileType,
    });

    res.json({
      success: true,
      message: 'Домашнее задание успешно отправлено!',
      submission,
    });
  } catch (error: any) {
    console.error('Submit homework error:', error);
    res.status(500).json({
      error: error.message || 'Failed to submit homework',
    });
  }
});

/**
 * GET /api/vk/homework/:lessonId/submissions
 * Get all submissions for a lesson (for teachers)
 */
router.get('/homework/:lessonId/submissions', async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;

    const submissions = await prisma.homeworkSubmission.findMany({
      where: { lessonId },
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
        student: {
          select: {
            id: true,
            fullName: true,
            vkUsername: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({
      success: true,
      submissions,
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
});

export default router;
