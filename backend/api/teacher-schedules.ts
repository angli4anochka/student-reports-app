import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
  userId: string;
  email: string;
}

const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  let userId: string;

  try {
    const payload = verifyToken(token);
    userId = payload.userId;
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    if (req.method === 'GET') {
      const { teacherId } = req.query;

      if (!teacherId) {
        return res.status(400).json({ error: 'teacherId is required' });
      }

      // Get all schedules for teacher
      const schedules = await prisma.teacherSchedule.findMany({
        where: { teacherId: teacherId as string },
        orderBy: [{ day: 'asc' }, { time: 'asc' }]
      });

      return res.status(200).json(schedules);
    }

    if (req.method === 'POST') {
      const { teacherId, day, time, groupName } = req.body;

      if (!teacherId || day === undefined || !time) {
        return res.status(400).json({ error: 'Missing required fields: teacherId, day, time' });
      }

      // If groupName is empty, delete the schedule slot
      if (!groupName || groupName.trim() === '') {
        await prisma.teacherSchedule.deleteMany({
          where: { teacherId, day, time }
        });
        return res.status(200).json({ message: 'Schedule slot deleted' });
      }

      // Create or update the schedule slot
      const schedule = await prisma.teacherSchedule.upsert({
        where: {
          teacherId_day_time: {
            teacherId,
            day,
            time
          }
        },
        update: { groupName: groupName.trim() },
        create: {
          teacherId,
          day,
          time,
          groupName: groupName.trim()
        }
      });

      return res.status(200).json(schedule);
    }

    if (req.method === 'DELETE') {
      const { teacherId, day, time } = req.query;

      if (!teacherId || day === undefined || !time) {
        return res.status(400).json({ error: 'Missing required fields: teacherId, day, time' });
      }

      await prisma.teacherSchedule.deleteMany({
        where: {
          teacherId: teacherId as string,
          day: parseInt(day as string),
          time: time as string
        }
      });

      return res.status(200).json({ message: 'Schedule slot deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Teacher schedules API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
