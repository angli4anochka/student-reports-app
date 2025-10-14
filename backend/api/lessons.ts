import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

function verifyToken(req: VercelRequest): any {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error('No authorization header');
  const token = authHeader.replace('Bearer ', '');
  return jwt.verify(token, JWT_SECRET);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;
  if (origin && (origin.includes('.vercel.app') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const user = verifyToken(req);
    const id = req.query.id as string | undefined;

    // GET /lessons - list lessons with filters
    if (!id && req.method === 'GET') {
      const { groupId } = req.query;
      const where: any = { teacherId: user.userId };
      if (groupId) where.groupId = groupId;

      const lessons = await prisma.lesson.findMany({
        where,
        include: {
          group: true
        },
        orderBy: { date: 'desc' }
      });
      return res.json(lessons);
    }

    // POST /lessons - create lesson
    if (!id && req.method === 'POST') {
      const { date, topic, homework, comment, groupId } = req.body;
      if (!date || !topic) {
        return res.status(400).json({ error: 'Date and topic are required' });
      }
      const lesson = await prisma.lesson.create({
        data: {
          date,
          topic,
          homework: homework || '',
          comment: comment || '',
          teacherId: user.userId,
          groupId: groupId || null
        },
        include: {
          group: true
        }
      });
      return res.status(201).json(lesson);
    }

    if (!id) return res.status(400).json({ error: 'Lesson ID required' });

    if (req.method === 'GET') {
      const lesson = await prisma.lesson.findUnique({
        where: { id },
        include: {
          group: true
        }
      });
      if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
      return res.json(lesson);
    }

    if (req.method === 'PUT') {
      const { date, topic, homework, comment, groupId } = req.body;
      const lesson = await prisma.lesson.update({
        where: { id },
        data: {
          date,
          topic,
          homework,
          comment,
          groupId: groupId || null
        },
        include: {
          group: true
        }
      });
      return res.json(lesson);
    }

    if (req.method === 'DELETE') {
      await prisma.lesson.delete({ where: { id } });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Lesson error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
