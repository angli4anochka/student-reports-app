import express from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

// GET /lessons - list lessons with filters
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const { groupId } = req.query;

    let lessons;
    if (groupId) {
      lessons = await prisma.$queryRaw`
        SELECT l.*,
               jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description) as group
        FROM lessons l
        LEFT JOIN groups g ON l."groupId" = g.id
        WHERE l."teacherId" = ${userId} AND l."groupId" = ${groupId}
        ORDER BY l.date DESC
      `;
    } else {
      lessons = await prisma.$queryRaw`
        SELECT l.*,
               jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description) as group
        FROM lessons l
        LEFT JOIN groups g ON l."groupId" = g.id
        WHERE l."teacherId" = ${userId}
        ORDER BY l.date DESC
      `;
    }

    return res.json(lessons);
  } catch (error) {
    console.error('Lessons fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /lessons/:id - get single lesson
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await prisma.$queryRaw`
      SELECT l.*,
             jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description) as group
      FROM lessons l
      LEFT JOIN groups g ON l."groupId" = g.id
      WHERE l.id = ${id}
    `;

    if (!lesson || (lesson as any[]).length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    return res.json((lesson as any[])[0]);
  } catch (error) {
    console.error('Lesson fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /lessons - create lesson
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const { date, topic, homework, comment, groupId } = req.body;

    if (!date || !topic) {
      return res.status(400).json({ error: 'Date and topic are required' });
    }

    const lessonId = randomUUID();
    const finalGroupId = groupId && groupId !== '' ? groupId : null;

    await prisma.$executeRaw`
      INSERT INTO lessons (id, date, topic, homework, comment, "teacherId", "groupId", "createdAt", "updatedAt")
      VALUES (${lessonId}, ${date}, ${topic}, ${homework || ''}, ${comment || ''}, ${userId}, ${finalGroupId}, NOW(), NOW())
    `;

    const lesson = await prisma.$queryRaw`
      SELECT l.*,
             jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description) as group
      FROM lessons l
      LEFT JOIN groups g ON l."groupId" = g.id
      WHERE l.id = ${lessonId}
    `;

    return res.status(201).json((lesson as any[])[0]);
  } catch (error) {
    console.error('Lesson create error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /lessons/:id - update lesson
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, topic, homework, comment, groupId } = req.body;
    const finalGroupId = groupId && groupId !== '' ? groupId : null;

    await prisma.$executeRaw`
      UPDATE lessons
      SET date = ${date}, topic = ${topic}, homework = ${homework}, comment = ${comment},
          "groupId" = ${finalGroupId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    const lesson = await prisma.$queryRaw`
      SELECT l.*,
             jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description) as group
      FROM lessons l
      LEFT JOIN groups g ON l."groupId" = g.id
      WHERE l.id = ${id}
    `;

    return res.json((lesson as any[])[0]);
  } catch (error) {
    console.error('Lesson update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /lessons/:id - delete lesson
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.$executeRaw`DELETE FROM lessons WHERE id = ${id}`;
    return res.status(204).end();
  } catch (error) {
    console.error('Lesson delete error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
