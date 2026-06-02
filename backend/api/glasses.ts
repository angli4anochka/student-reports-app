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
  // CORS headers - must be set first
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const user = verifyToken(req);
    const { entity } = req.query; // 'groups' or 'students'
    const id = req.query.id as string | undefined;
    const groupId = req.query.groupId as string | undefined;

    // ========== GROUPS ==========
    if (entity === 'groups') {
      // GET /glasses?entity=groups - list all groups for current teacher
      if (!id && req.method === 'GET') {
        const groups = await prisma.glassesGroup.findMany({
          where: { teacherId: user.userId },
          include: {
            _count: { select: { students: true } }
          },
          orderBy: { createdAt: 'asc' }
        });
        return res.json(groups);
      }

      // POST /glasses?entity=groups - create new group
      if (!id && req.method === 'POST') {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Group name is required' });

        const group = await prisma.glassesGroup.create({
          data: {
            name,
            teacherId: user.userId
          }
        });
        return res.status(201).json(group);
      }

      if (!id) return res.status(400).json({ error: 'Group ID required' });

      // DELETE /glasses?entity=groups&id=xxx
      if (req.method === 'DELETE') {
        const group = await prisma.glassesGroup.findUnique({
          where: { id }
        });

        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.teacherId !== user.userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }

        await prisma.glassesGroup.delete({ where: { id } });
        return res.status(204).end();
      }
    }

    // ========== STUDENTS ==========
    if (entity === 'students') {
      // GET /glasses?entity=students&groupId=xxx - list students for a group
      if (!id && req.method === 'GET') {
        if (!groupId) {
          return res.status(400).json({ error: 'groupId is required' });
        }

        // Verify group ownership
        const group = await prisma.glassesGroup.findUnique({
          where: { id: groupId }
        });

        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.teacherId !== user.userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }

        const students = await prisma.glassesStudent.findMany({
          where: { groupId },
          orderBy: { points: 'desc' } // Sort by points descending
        });

        return res.json(students);
      }

      // POST /glasses?entity=students - create new student
      if (!id && req.method === 'POST') {
        const { fullName, groupId } = req.body;

        if (!fullName || !groupId) {
          return res.status(400).json({ error: 'fullName and groupId are required' });
        }

        // Verify group ownership
        const group = await prisma.glassesGroup.findUnique({
          where: { id: groupId }
        });

        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.teacherId !== user.userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }

        const student = await prisma.glassesStudent.create({
          data: {
            fullName,
            groupId,
            points: 0
          }
        });

        return res.status(201).json(student);
      }

      if (!id) return res.status(400).json({ error: 'Student ID required' });

      // PUT /glasses?entity=students&id=xxx - update student points
      if (req.method === 'PUT') {
        const { points } = req.body;

        if (points === undefined || points === null) {
          return res.status(400).json({ error: 'points is required' });
        }

        // Verify ownership through group
        const student = await prisma.glassesStudent.findUnique({
          where: { id },
          include: { group: true }
        });

        if (!student) return res.status(404).json({ error: 'Student not found' });
        if (student.group.teacherId !== user.userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }

        const updatedStudent = await prisma.glassesStudent.update({
          where: { id },
          data: { points: parseInt(points) }
        });

        return res.json(updatedStudent);
      }

      // DELETE /glasses?entity=students&id=xxx
      if (req.method === 'DELETE') {
        // Verify ownership through group
        const student = await prisma.glassesStudent.findUnique({
          where: { id },
          include: { group: true }
        });

        if (!student) return res.status(404).json({ error: 'Student not found' });
        if (student.group.teacherId !== user.userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }

        await prisma.glassesStudent.delete({ where: { id } });
        return res.status(204).end();
      }
    }

    return res.status(400).json({ error: 'Invalid entity type. Use entity=groups or entity=students' });

  } catch (error) {
    console.error('Glasses API error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
