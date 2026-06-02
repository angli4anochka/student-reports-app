import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/group-collaborators?groupId=xxx - Get collaborators list
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { groupId } = req.query;
    const user = req.user;

    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId as string },
      include: {
        collaborators: {
          include: {
            teacher: {
              select: { id: true, fullName: true, email: true }
            }
          }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user has access (owner or collaborator)
    const isOwner = group.teacherId === user?.userId;
    const isCollaborator = group.collaborators.some(c => c.teacherId === user?.userId);

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json(group.collaborators);
  } catch (error) {
    console.error('Error fetching group collaborators:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/group-collaborators?groupId=xxx - Add collaborator
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { groupId } = req.query;
    const { teacherId: newTeacherId } = req.body;
    const user = req.user;

    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    if (!newTeacherId) {
      return res.status(400).json({ error: 'Teacher ID is required' });
    }

    // Check if group exists and user is the owner
    const group = await prisma.group.findFirst({
      where: {
        id: groupId as string,
        teacherId: user?.userId
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found or you are not the owner' });
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
    const existing = await prisma.groupTeacher.findUnique({
      where: {
        groupId_teacherId: {
          groupId: groupId as string,
          teacherId: newTeacherId
        }
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Teacher is already a collaborator' });
    }

    // Add collaborator
    const collaboration = await prisma.groupTeacher.create({
      data: {
        groupId: groupId as string,
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
    console.error('Error adding group collaborator:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/group-collaborators?groupId=xxx&teacherId=yyy - Remove collaborator
router.delete('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { groupId, teacherId } = req.query;
    const user = req.user;

    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    if (!teacherId) {
      return res.status(400).json({ error: 'Teacher ID is required' });
    }

    // Check if group exists and user is the owner
    const group = await prisma.group.findFirst({
      where: {
        id: groupId as string,
        teacherId: user?.userId
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found or you are not the owner' });
    }

    // Remove collaborator
    await prisma.groupTeacher.deleteMany({
      where: {
        groupId: groupId as string,
        teacherId: teacherId as string
      }
    });

    return res.status(204).end();
  } catch (error) {
    console.error('Error removing group collaborator:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
