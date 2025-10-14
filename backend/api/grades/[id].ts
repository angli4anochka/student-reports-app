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

  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = verifyToken(req);
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid grade ID' });
    }

    if (req.method === 'GET') {
      const grade = await prisma.grade.findUnique({
        where: { id },
        include: {
          student: true,
          year: true,
          criteriaGrades: {
            include: {
              criterion: true
            }
          }
        }
      });

      if (!grade) {
        return res.status(404).json({ error: 'Grade not found' });
      }

      return res.json(grade);
    }

    if (req.method === 'PUT') {
      const { attendance, homework, comment, recommendations, criteriaGrades } = req.body;

      const grade = await prisma.grade.update({
        where: { id },
        data: {
          attendance,
          homework,
          comment,
          recommendations
        },
        include: {
          student: true,
          year: true,
          criteriaGrades: {
            include: {
              criterion: true
            }
          }
        }
      });

      // Update criteria grades if provided
      if (criteriaGrades && Array.isArray(criteriaGrades)) {
        for (const cg of criteriaGrades) {
          await prisma.criterionGrade.upsert({
            where: {
              gradeId_criterionId: {
                gradeId: grade.id,
                criterionId: cg.criterionId
              }
            },
            update: {
              value: cg.value
            },
            create: {
              gradeId: grade.id,
              criterionId: cg.criterionId,
              value: cg.value
            }
          });
        }
      }

      // Fetch updated grade with criteria
      const updatedGrade = await prisma.grade.findUnique({
        where: { id: grade.id },
        include: {
          student: true,
          year: true,
          criteriaGrades: {
            include: {
              criterion: true
            }
          }
        }
      });

      return res.json(updatedGrade);
    }

    if (req.method === 'DELETE') {
      await prisma.grade.delete({
        where: { id }
      });

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
