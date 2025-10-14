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

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = verifyToken(req);

    if (req.method === 'GET') {
      const { studentId, yearId, month } = req.query;

      const where: any = {};
      if (studentId) where.studentId = studentId;
      if (yearId) where.yearId = yearId;
      if (month) where.month = month;

      const grades = await prisma.grade.findMany({
        where,
        include: {
          student: true,
          criterion: true,
          year: true
        },
        orderBy: [
          { year: { year: 'desc' } },
          { month: 'asc' }
        ]
      });

      return res.json(grades);
    }

    if (req.method === 'POST') {
      const { studentId, criterionId, yearId, month, value } = req.body;

      if (!studentId || !criterionId || !yearId || !month || value === undefined) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Upsert - update if exists, create if not
      const grade = await prisma.grade.upsert({
        where: {
          studentId_criterionId_yearId_month: {
            studentId,
            criterionId,
            yearId,
            month
          }
        },
        update: { value },
        create: {
          studentId,
          criterionId,
          yearId,
          month,
          value
        },
        include: {
          student: true,
          criterion: true,
          year: true
        }
      });

      return res.json(grade);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Grades error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
