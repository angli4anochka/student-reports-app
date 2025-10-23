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
      // Get attendance records with filters using Prisma
      const { studentId, groupId, dateFrom, dateTo } = req.query;

      const where: any = {
        teacherId: userId
      };

      if (studentId) {
        where.studentId = studentId as string;
      }

      if (groupId) {
        where.groupId = groupId as string;
      }

      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = dateFrom as string;
        if (dateTo) where.date.lte = dateTo as string;
      }

      const attendance = await prisma.attendance.findMany({
        where,
        orderBy: { date: 'desc' }
      });

      return res.status(200).json(attendance);
    }

    if (req.method === 'POST') {
      // Create or update attendance record using Prisma
      const { studentId, date, status, groupId } = req.body;

      if (!studentId || !date || !status) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const attendance = await prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId,
            date
          }
        },
        update: {
          status,
          groupId: groupId || null,
          teacherId: userId
        },
        create: {
          studentId,
          date,
          status,
          teacherId: userId,
          groupId: groupId || null
        }
      });

      return res.status(200).json(attendance);
    }

    if (req.method === 'DELETE') {
      const { studentId, date } = req.query;

      if (!studentId || !date) {
        return res.status(400).json({ error: 'Missing studentId or date' });
      }

      await prisma.attendance.deleteMany({
        where: {
          studentId: studentId as string,
          date: date as string,
          teacherId: userId
        }
      });

      return res.status(200).json({ message: 'Attendance record deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Attendance API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
