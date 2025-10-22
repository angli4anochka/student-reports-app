import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all teachers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const teachers = await prisma.user.findMany({
      where: {
        role: 'TEACHER'
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    res.json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

export default router;
