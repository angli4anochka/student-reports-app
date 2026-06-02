import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;

    // Get current user's organization
    const currentUser = await prisma.user.findUnique({
      where: { id: user?.userId },
      select: { organizationId: true, role: true }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    let whereCondition: any = {
      role: 'TEACHER'
    };

    // If user has an organization, only show teachers from same organization
    if (currentUser.organizationId) {
      whereCondition.organizationId = currentUser.organizationId;
    } else {
      // Individual tutor - show only teachers without organization (individual tutors)
      whereCondition.organizationId = null;
    }

    // Fetch teachers with proper isolation
    const teachers = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    return res.status(200).json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
