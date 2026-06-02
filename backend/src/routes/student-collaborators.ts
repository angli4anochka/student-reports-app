import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/student-collaborators?studentId=xxx - Get collaborators list
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { studentId } = req.query;
    const user = req.user;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId as string },
      include: {
        sharedTeachers: {
          include: {
            teacher: {
              select: { id: true, fullName: true, email: true }
            }
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if user has access (owner or collaborator)
    const isOwner = student.teacherId === user?.userId;
    const isCollaborator = student.sharedTeachers.some(c => c.teacherId === user?.userId);

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json(student.sharedTeachers);
  } catch (error) {
    console.error('Error fetching student collaborators:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/student-collaborators?studentId=xxx - Add collaborator
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { studentId } = req.query;
    const { teacherId: newTeacherId } = req.body;
    const user = req.user;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    if (!newTeacherId) {
      return res.status(400).json({ error: 'Teacher ID is required' });
    }

    // Check if student exists and user is the owner
    const student = await prisma.student.findFirst({
      where: {
        id: studentId as string,
        teacherId: user?.userId
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found or you are not the owner' });
    }

    // Check if teacher exists
    const teacher = await prisma.user.findUnique({
      where: { id: newTeacherId },
      select: { id: true, fullName: true, email: true, role: true }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    if (teacher.role !== 'TEACHER') {
      return res.status(400).json({ error: 'Can only add teachers as collaborators' });
    }

    // Check if already a collaborator
    const existing = await prisma.studentTeacher.findUnique({
      where: {
        studentId_teacherId: {
          studentId: studentId as string,
          teacherId: newTeacherId
        }
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Teacher is already a collaborator' });
    }

    // Add collaborator
    const collaboration = await prisma.studentTeacher.create({
      data: {
        studentId: studentId as string,
        teacherId: newTeacherId
      },
      include: {
        teacher: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });

    return res.status(201).json(collaboration);
  } catch (error) {
    console.error('Error adding student collaborator:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/student-collaborators?studentId=xxx&teacherId=yyy - Remove collaborator
router.delete('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { studentId, teacherId } = req.query;
    const user = req.user;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    if (!teacherId) {
      return res.status(400).json({ error: 'Teacher ID is required' });
    }

    // Check if student exists and user is the owner
    const student = await prisma.student.findFirst({
      where: {
        id: studentId as string,
        teacherId: user?.userId
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found or you are not the owner' });
    }

    // Remove collaborator
    await prisma.studentTeacher.deleteMany({
      where: {
        studentId: studentId as string,
        teacherId: teacherId as string
      }
    });

    return res.status(204).end();
  } catch (error) {
    console.error('Error removing student collaborator:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
