import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /notes - get teacher notes
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let notes = await prisma.teacherNotes.findUnique({
      where: { teacherId: userId }
    });

    // If notes don't exist, create empty notes
    if (!notes) {
      notes = await prisma.teacherNotes.create({
        data: {
          teacherId: userId,
          content: ''
        }
      });
    }

    return res.json(notes);
  } catch (error) {
    console.error('Notes fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /notes - update teacher notes
router.put('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { content } = req.body;

    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' });
    }

    const notes = await prisma.teacherNotes.upsert({
      where: { teacherId: userId },
      update: { content },
      create: {
        teacherId: userId,
        content
      }
    });

    return res.json(notes);
  } catch (error) {
    console.error('Notes update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
