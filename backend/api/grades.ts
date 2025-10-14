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

    // GET /grades - list grades with filters
    if (!id && req.method === 'GET') {
      const { studentId, yearId, month } = req.query;
      const where: any = {};
      if (studentId) where.studentId = studentId;
      if (yearId) where.yearId = yearId;
      if (month) where.month = month;

      const grades = await prisma.grade.findMany({
        where,
        include: {
          student: true,
          year: true,
          criteriaGrades: { include: { criterion: true } }
        },
        orderBy: [{ year: { year: 'desc' } }, { month: 'asc' }]
      });
      return res.json(grades);
    }

    // POST /grades - create grade
    if (!id && req.method === 'POST') {
      const { studentId, yearId, month, attendance, homework, comment, recommendations, criteriaGrades } = req.body;
      if (!studentId || !yearId || !month) {
        return res.status(400).json({ error: 'Student ID, year ID, and month are required' });
      }

      const grade = await prisma.grade.upsert({
        where: { studentId_yearId_month: { studentId, yearId, month } },
        update: { attendance, homework, comment, recommendations },
        create: { studentId, yearId, month, attendance, homework, comment, recommendations },
        include: {
          student: true,
          year: true,
          criteriaGrades: { include: { criterion: true } }
        }
      });

      if (criteriaGrades && Array.isArray(criteriaGrades)) {
        for (const cg of criteriaGrades) {
          await prisma.criterionGrade.upsert({
            where: { gradeId_criterionId: { gradeId: grade.id, criterionId: cg.criterionId } },
            update: { value: cg.value },
            create: { gradeId: grade.id, criterionId: cg.criterionId, value: cg.value }
          });
        }
      }

      const updatedGrade = await prisma.grade.findUnique({
        where: { id: grade.id },
        include: {
          student: true,
          year: true,
          criteriaGrades: { include: { criterion: true } }
        }
      });
      return res.json(updatedGrade);
    }

    if (!id) return res.status(400).json({ error: 'Grade ID required' });

    if (req.method === 'GET') {
      const grade = await prisma.grade.findUnique({
        where: { id },
        include: {
          student: true,
          year: true,
          criteriaGrades: { include: { criterion: true } }
        }
      });
      if (!grade) return res.status(404).json({ error: 'Grade not found' });
      return res.json(grade);
    }

    if (req.method === 'PUT') {
      const { attendance, homework, comment, recommendations, criteriaGrades } = req.body;
      const grade = await prisma.grade.update({
        where: { id },
        data: { attendance, homework, comment, recommendations }
      });

      if (criteriaGrades && Array.isArray(criteriaGrades)) {
        for (const cg of criteriaGrades) {
          await prisma.criterionGrade.upsert({
            where: { gradeId_criterionId: { gradeId: grade.id, criterionId: cg.criterionId } },
            update: { value: cg.value },
            create: { gradeId: grade.id, criterionId: cg.criterionId, value: cg.value }
          });
        }
      }

      const updatedGrade = await prisma.grade.findUnique({
        where: { id: grade.id },
        include: {
          student: true,
          year: true,
          criteriaGrades: { include: { criterion: true } }
        }
      });
      return res.json(updatedGrade);
    }

    if (req.method === 'DELETE') {
      await prisma.grade.delete({ where: { id } });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Grade error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
