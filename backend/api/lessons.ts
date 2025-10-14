import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

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

      let lessons;
      if (groupId) {
        lessons = await prisma.$queryRaw`
          SELECT l.*,
                 jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description) as group
          FROM lessons l
          LEFT JOIN groups g ON l."groupId" = g.id
          WHERE l."teacherId" = ${user.userId} AND l."groupId" = ${groupId}
          ORDER BY l.date DESC
        `;
      } else {
        lessons = await prisma.$queryRaw`
          SELECT l.*,
                 jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description) as group
          FROM lessons l
          LEFT JOIN groups g ON l."groupId" = g.id
          WHERE l."teacherId" = ${user.userId}
          ORDER BY l.date DESC
        `;
      }

      return res.json(lessons);
    }

    // POST /lessons - create lesson
    if (!id && req.method === 'POST') {
      try {
        const { date, topic, homework, comment, groupId } = req.body;
        console.log('Creating lesson:', { date, topic, homework, comment, groupId, userId: user.userId });

        if (!date || !topic) {
          return res.status(400).json({ error: 'Date and topic are required' });
        }

        const lessonId = randomUUID();
        const now = new Date().toISOString();
        const finalGroupId = groupId && groupId !== '' ? groupId : null;

        console.log('Inserting lesson with ID:', lessonId, 'groupId:', finalGroupId);

        await prisma.$executeRaw`
          INSERT INTO lessons (id, date, topic, homework, comment, "teacherId", "groupId", "createdAt", "updatedAt")
          VALUES (${lessonId}, ${date}, ${topic}, ${homework || ''}, ${comment || ''}, ${user.userId}, ${finalGroupId}, ${now}, ${now})
        `;

        console.log('Lesson inserted, fetching result');

        const lesson = await prisma.$queryRaw`
          SELECT l.*,
                 jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description) as group
          FROM lessons l
          LEFT JOIN groups g ON l."groupId" = g.id
          WHERE l.id = ${lessonId}
        `;

        console.log('Lesson fetched:', lesson);
        return res.status(201).json((lesson as any[])[0]);
      } catch (insertError) {
        console.error('Error creating lesson:', insertError);
        throw insertError;
      }
    }

    if (!id) return res.status(400).json({ error: 'Lesson ID required' });

    if (req.method === 'GET') {
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
    }

    if (req.method === 'PUT') {
      const { date, topic, homework, comment, groupId } = req.body;
      const now = new Date().toISOString();
      const finalGroupId = groupId && groupId !== '' ? groupId : null;

      await prisma.$executeRaw`
        UPDATE lessons
        SET date = ${date}, topic = ${topic}, homework = ${homework}, comment = ${comment},
            "groupId" = ${finalGroupId}, "updatedAt" = ${now}
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
    }

    if (req.method === 'DELETE') {
      await prisma.$executeRaw`DELETE FROM lessons WHERE id = ${id}`;
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
