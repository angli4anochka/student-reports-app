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

    // GET /groups - list all groups (owned + shared)
    if (!id && req.method === 'GET') {
      const userId = user.userId;

      // Get current user's info
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, school: true }
      });

      if (!currentUser) {
        return res.status(401).json({ error: 'User not found' });
      }

      // For teachers - get owned groups AND shared groups
      if (currentUser.role === 'TEACHER') {
        // Get owned groups
        const ownedGroups = await prisma.group.findMany({
          where: { teacherId: userId },
          include: {
            _count: { select: { students: true } },
            teacher: { select: { id: true, fullName: true, email: true } },
            collaborators: {
              include: {
                teacher: { select: { id: true, fullName: true, email: true } }
              }
            }
          },
          orderBy: { name: 'asc' }
        });

        // Get shared groups (where user is a collaborator)
        const sharedGroupsRelations = await prisma.groupTeacher.findMany({
          where: { teacherId: userId },
          include: {
            group: {
              include: {
                _count: { select: { students: true } },
                teacher: { select: { id: true, fullName: true, email: true } },
                collaborators: {
                  include: {
                    teacher: { select: { id: true, fullName: true, email: true } }
                  }
                }
              }
            }
          }
        });

        const sharedGroups = sharedGroupsRelations.map(rel => rel.group);

        // Combine both lists and mark ownership
        // Mark owned groups as shared if they have collaborators
        const ownedGroupsWithFlags = ownedGroups.map(g => ({
          ...g,
          isOwner: true,
          isShared: g.collaborators.length > 0 // Shared if has collaborators
        }));

        // Add shared groups (exclude ones already in owned to prevent duplicates)
        const ownedGroupIds = new Set(ownedGroups.map(g => g.id));
        const uniqueSharedGroups = sharedGroups
          .filter(g => !ownedGroupIds.has(g.id))
          .map(g => ({ ...g, isOwner: false, isShared: true }));

        const allGroups = [...ownedGroupsWithFlags, ...uniqueSharedGroups];

        return res.json(allGroups);
      }

      // For admins - existing logic
      const where: any = {};
      if (currentUser.role === 'ADMIN') {
        if (currentUser.school) {
          // School admin sees all groups from teachers in their school
          const schoolTeachers = await prisma.user.findMany({
            where: { school: currentUser.school },
            select: { id: true }
          });
          where.teacherId = { in: schoolTeachers.map(t => t.id) };
        }
        // Super admin (no school) sees ALL groups - no filter needed
      }

      const groups = await prisma.group.findMany({
        where,
        include: {
          _count: { select: { students: true } },
          teacher: { select: { id: true, fullName: true, email: true } },
          collaborators: {
            include: {
              teacher: { select: { id: true, fullName: true, email: true } }
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      // Add isOwner flag for admins
      const groupsWithOwnership = groups.map(g => ({
        ...g,
        isOwner: g.teacherId === userId,
        isShared: false
      }));

      return res.json(groupsWithOwnership);
    }

    // POST /groups - create new group
    if (!id && req.method === 'POST') {
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ error: 'Group name is required' });
      const group = await prisma.group.create({
        data: { name, description, teacherId: user.userId }
      });
      return res.status(201).json(group);
    }

    if (!id) return res.status(400).json({ error: 'Group ID required' });

    // GET /groups/{id}
    if (req.method === 'GET') {
      const group = await prisma.group.findUnique({
        where: { id },
        include: { _count: { select: { students: true } } }
      });
      if (!group) return res.status(404).json({ error: 'Group not found' });
      return res.json(group);
    }

    if (req.method === 'PUT') {
      const { name, description } = req.body;
      const group = await prisma.group.update({
        where: { id },
        data: { name, description }
      });
      return res.json(group);
    }

    if (req.method === 'DELETE') {
      await prisma.group.delete({ where: { id } });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Group error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
