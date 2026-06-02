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

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const user = verifyToken(req);
    const { groupId, teacherId } = req.query;

    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    // GET /api/group-collaborators?groupId=xxx - Get collaborators list
    if (req.method === 'GET') {
      const group = await prisma.group.findUnique({
        where: { id: groupId as string },
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

      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      // Check if user has access (owner or collaborator)
      const isOwner = group.teacherId === user.userId;
      const isCollaborator = group.collaborators.some(c => c.teacherId === user.userId);

      if (!isOwner && !isCollaborator) {
        return res.status(403).json({ error: 'Access denied' });
      }

      return res.json(group.collaborators);
    }

    // POST /api/group-collaborators?groupId=xxx - Add collaborator
    if (req.method === 'POST') {
      const { teacherId: newTeacherId } = req.body;

      if (!newTeacherId) {
        return res.status(400).json({ error: 'Teacher ID is required' });
      }

      // Check if group exists and user is the owner
      const group = await prisma.group.findFirst({
        where: {
          id: groupId as string,
          teacherId: user.userId
        }
      });

      if (!group) {
        return res.status(404).json({ error: 'Group not found or you are not the owner' });
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
      const existing = await prisma.groupTeacher.findUnique({
        where: {
          groupId_teacherId: {
            groupId: groupId as string,
            teacherId: newTeacherId
          }
        }
      });

      if (existing) {
        return res.status(409).json({ error: 'Teacher is already a collaborator' });
      }

      // Add collaborator
      const collaboration = await prisma.groupTeacher.create({
        data: {
          groupId: groupId as string,
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

    // DELETE /api/group-collaborators?groupId=xxx&teacherId=yyy - Remove collaborator
    if (req.method === 'DELETE') {
      if (!teacherId) {
        return res.status(400).json({ error: 'Teacher ID is required' });
      }

      // Check if group exists and user is the owner
      const group = await prisma.group.findFirst({
        where: {
          id: groupId as string,
          teacherId: user.userId
        }
      });

      if (!group) {
        return res.status(404).json({ error: 'Group not found or you are not the owner' });
      }

      // Remove collaborator
      await prisma.groupTeacher.deleteMany({
        where: {
          groupId: groupId as string,
          teacherId: teacherId as string
        }
      });

      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Group collaborators error:', error);
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
