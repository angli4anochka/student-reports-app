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
  if (origin && (origin.includes('.vercel.app') || origin.includes('localhost') || origin.includes('158.160.221.5'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const user = verifyToken(req);
    const { studentId, teacherId } = req.query;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    // GET /api/student-collaborators?studentId=xxx - Get collaborators list
    if (req.method === 'GET') {
      const student = await prisma.student.findUnique({
        where: { id: studentId as string },
        include: {
          collaborators: {
            include: {
              teacher: {
                select: { id: true, fullName: true, email: true }
              }
            }
          }
        }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Check if user has access (owner or collaborator)
      const isOwner = student.teacherId === user.userId;
      const isCollaborator = student.collaborators.some(c => c.teacherId === user.userId);

      if (!isOwner && !isCollaborator) {
        return res.status(403).json({ error: 'Access denied' });
      }

      return res.json(student.collaborators);
    }

    // POST /api/student-collaborators?studentId=xxx - Add collaborator
    if (req.method === 'POST') {
      const { teacherId: newTeacherId } = req.body;

      if (!newTeacherId) {
        return res.status(400).json({ error: 'Teacher ID is required' });
      }

      // Check if student exists and user is the owner
      const student = await prisma.student.findFirst({
        where: {
          id: studentId as string,
          teacherId: user.userId
        }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found or you are not the owner' });
      }

      // Check if teacher exists
      const teacher = await prisma.user.findUnique({
        where: { id: newTeacherId },
        select: { id: true, fullName: true, email: true, role: true }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }

      if (teacher.role !== 'TEACHER') {
        return res.status(400).json({ error: 'Can only add teachers as collaborators' });
      }

      // Check if already a collaborator
      const existing = await prisma.studentTeacher.findUnique({
        where: {
          studentId_teacherId: {
            studentId: studentId as string,
            teacherId: newTeacherId
          }
        }
      });

      if (existing) {
        return res.status(409).json({ error: 'Teacher is already a collaborator' });
      }

      // Add collaborator
      const collaboration = await prisma.studentTeacher.create({
        data: {
          studentId: studentId as string,
          teacherId: newTeacherId
        },
        include: {
          teacher: {
            select: { id: true, fullName: true, email: true }
          }
        }
      });

      return res.status(201).json(collaboration);
    }

    // DELETE /api/student-collaborators?studentId=xxx&teacherId=yyy - Remove collaborator
    if (req.method === 'DELETE') {
      if (!teacherId) {
        return res.status(400).json({ error: 'Teacher ID is required' });
      }

      // Check if student exists and user is the owner
      const student = await prisma.student.findFirst({
        where: {
          id: studentId as string,
          teacherId: user.userId
        }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found or you are not the owner' });
      }

      // Remove collaborator
      await prisma.studentTeacher.deleteMany({
        where: {
          studentId: studentId as string,
          teacherId: teacherId as string
        }
      });

      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Student collaborators error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await prisma.$disconnect();
  }
}
