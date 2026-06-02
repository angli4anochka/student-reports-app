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
    // Get current user info for access control
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, school: true }
    });

    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (req.method === 'GET') {
      const { teacherId } = req.query;

      if (!teacherId) {
        return res.status(400).json({ error: 'teacherId is required' });
      }

      // Check if user can access this teacher's schedule
      const targetTeacher = await prisma.user.findUnique({
        where: { id: teacherId as string },
        select: { school: true, role: true }
      });

      if (!targetTeacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }

      // Access control logic
      if (currentUser.role === 'TEACHER') {
        // Teachers can only see their own schedule
        if (teacherId !== userId) {
          return res.status(403).json({ error: 'Access denied: You can only view your own schedule' });
        }
      } else if (currentUser.role === 'ADMIN') {
        if (currentUser.school !== null) {
          // School admin can only see schedules from their school
          if (targetTeacher.school !== currentUser.school) {
            return res.status(403).json({ error: 'Access denied: Teacher not in your school' });
          }
        }
        // Super admin (school = null) can see all schedules
      }

      // Get all schedules for teacher
      const schedules = await prisma.teacherSchedule.findMany({
        where: { teacherId: teacherId as string },
        orderBy: [{ day: 'asc' }, { time: 'asc' }]
      });

      return res.status(200).json(schedules);
    }

    if (req.method === 'POST') {
      const { teacherId, day, time, groupName, color } = req.body;

      if (!teacherId || day === undefined || !time) {
        return res.status(400).json({ error: 'Missing required fields: teacherId, day, time' });
      }

      // Check if user can modify this teacher's schedule
      const targetTeacher = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { school: true }
      });

      if (!targetTeacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }

      // Access control for modifications
      if (currentUser.role === 'TEACHER') {
        // Teachers can only modify their own schedule
        if (teacherId !== userId) {
          return res.status(403).json({ error: 'Access denied: You can only modify your own schedule' });
        }
      } else if (currentUser.role === 'ADMIN' && currentUser.school !== null) {
        // School admin can only modify schedules from their school
        if (targetTeacher.school !== currentUser.school) {
          return res.status(403).json({ error: 'Access denied: Teacher not in your school' });
        }
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
        update: {
          groupName: groupName.trim(),
          color: color || '#FFD700'
        },
        create: {
          teacherId,
          day,
          time,
          groupName: groupName.trim(),
          color: color || '#FFD700'
        }
      });

      return res.status(200).json(schedule);
    }

    if (req.method === 'DELETE') {
      const { teacherId, day, time } = req.query;

      if (!teacherId || day === undefined || !time) {
        return res.status(400).json({ error: 'Missing required fields: teacherId, day, time' });
      }

      // Check if user can delete this teacher's schedule
      const targetTeacher = await prisma.user.findUnique({
        where: { id: teacherId as string },
        select: { school: true }
      });

      if (!targetTeacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }

      // Access control for deletions
      if (currentUser.role === 'TEACHER') {
        // Teachers can only delete their own schedule
        if (teacherId !== userId) {
          return res.status(403).json({ error: 'Access denied: You can only delete your own schedule' });
        }
      } else if (currentUser.role === 'ADMIN' && currentUser.school !== null) {
        // School admin can only delete schedules from their school
        if (targetTeacher.school !== currentUser.school) {
          return res.status(403).json({ error: 'Access denied: Teacher not in your school' });
        }
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
