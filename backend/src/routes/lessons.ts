import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get lessons
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.query;

    const filters: any = {};
    if (groupId) {
      filters.groupId = groupId as string;
    }

    const lessons = await prisma.lesson.findMany({
      where: filters,
      include: {
        group: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

// Get single lesson
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        group: {
          select: {
            name: true
          }
        }
      }
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json(lesson);
  } catch (error) {
    console.error('Error fetching lesson:', error);
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
});

// Create lesson
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { date, topic, homework, comment, groupId } = req.body;

    if (!date || !topic) {
      return res.status(400).json({ error: 'date and topic are required' });
    }

    const lesson = await prisma.lesson.create({
      data: {
        date,
        topic,
        homework,
        comment,
        groupId
      }
    });

    res.status(201).json(lesson);
  } catch (error) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

// Update lesson
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, topic, homework, comment, groupId } = req.body;

    const updateData: any = {};
    if (date) updateData.date = date;
    if (topic) updateData.topic = topic;
    if (homework !== undefined) updateData.homework = homework;
    if (comment !== undefined) updateData.comment = comment;
    if (groupId !== undefined) updateData.groupId = groupId;

    const lesson = await prisma.lesson.update({
      where: { id },
      data: updateData
    });

    res.json(lesson);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Lesson not found' });
    } else {
      console.error('Error updating lesson:', error);
      res.status(500).json({ error: 'Failed to update lesson' });
    }
  }
});

// Delete lesson
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.lesson.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Lesson not found' });
    } else {
      console.error('Error deleting lesson:', error);
      res.status(500).json({ error: 'Failed to delete lesson' });
    }
  }
});

export default router;
