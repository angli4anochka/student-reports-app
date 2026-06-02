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
    const action = req.query.action as string | undefined;

    // GET /students - list students
    if (!id && req.method === 'GET') {
      const { groupId, group, q } = req.query;
      const where: any = {};

      // Get current user's info
      const currentUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { role: true, school: true }
      });

      if (!currentUser) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Filter by school/teacher based on role
      if (currentUser.role === 'ADMIN') {
        if (currentUser.school) {
          // School admin sees all students from teachers in their school
          const schoolTeachers = await prisma.user.findMany({
            where: { school: currentUser.school },
            select: { id: true }
          });
          where.teacherId = { in: schoolTeachers.map(t => t.id) };
        }
        // Super admin (no school) sees ALL students - no filter needed
      } else {
        // Teacher sees their own students + students from shared groups
        const sharedGroups = await prisma.groupTeacher.findMany({
          where: { teacherId: user.userId },
          select: { groupId: true }
        });
        const sharedGroupIds = sharedGroups.map(g => g.groupId);

        // If groupId filter is specified
        if (groupId) {
          // Return students from this group if it's owned OR shared
          const ownedGroups = await prisma.group.findMany({
            where: { teacherId: user.userId },
            select: { id: true }
          });
          const ownedGroupIds = ownedGroups.map(g => g.id);

          // Check if this group is owned or shared
          const isOwned = ownedGroupIds.includes(groupId as string);
          const isShared = sharedGroupIds.includes(groupId as string);

          if (isOwned || isShared) {
            // Return ALL students from this group (regardless of teacherId)
            where.groupId = groupId as string;
          } else {
            // No access to this group - return empty
            where.id = 'non-existent-id'; // Force empty result
          }
        } else {
          // No groupId filter: return own students + students from shared groups
          if (sharedGroupIds.length > 0) {
            // Has shared groups: include both own and shared students
            where.OR = [
              { teacherId: user.userId },
              { groupId: { in: sharedGroupIds } }
            ];
          } else {
            // No shared groups: only own students
            where.teacherId = user.userId;
          }
        }
      }

      // For admins, groupId filter is applied separately
      if (currentUser.role === 'ADMIN' && groupId) {
        where.groupId = groupId;
      }

      if (group) where.group = { name: group };

      // Handle search query without overwriting existing OR filter
      if (q) {
        const searchCondition = {
          OR: [
            { fullName: { contains: q as string, mode: 'insensitive' } },
            { email: { contains: q as string, mode: 'insensitive' } }
          ]
        };

        // If we already have an OR filter (for teachers), wrap both in AND
        if (where.OR) {
          const existingOR = where.OR;
          delete where.OR;
          where.AND = [
            { OR: existingOR },
            searchCondition
          ];
        } else {
          // For admins or when no OR filter exists, just add search
          Object.assign(where, searchCondition);
        }
      }
      const students = await prisma.student.findMany({
        where,
        include: { group: true, teacher: { select: { fullName: true, email: true } } },
        orderBy: { fullName: 'asc' }
      });
      return res.json(students);
    }

    // POST /students - create student
    if (!id && req.method === 'POST') {
      const { fullName, groupId, notes } = req.body;
      if (!fullName) {
        return res.status(400).json({ error: 'Full name is required' });
      }
      const student = await prisma.student.create({
        data: {
          fullName,
          groupId: groupId || null,
          notes,
          teacherId: user.userId
        },
        include: { group: true }
      });
      return res.status(201).json(student);
    }

    if (!id) return res.status(400).json({ error: 'Student ID required' });

    // GET /students/{id}/grades
    if (action === 'grades' && req.method === 'GET') {
      const { yearId, month } = req.query;
      const where: any = { studentId: id };
      if (yearId) where.yearId = yearId;
      if (month) where.month = month;

      const grades = await prisma.grade.findMany({
        where,
        include: {
          student: true,
          year: true,
          criteriaGrades: { include: { criterion: true } }
        } as any,
        orderBy: [{ year: { year: 'desc' } }, { month: 'asc' }] as any
      });
      return res.json(grades);
    }

    if (req.method === 'GET') {
      const student = await prisma.student.findUnique({
        where: { id },
        include: { group: true }
      });
      if (!student) return res.status(404).json({ error: 'Student not found' });
      return res.json(student);
    }

    if (req.method === 'PUT') {
      const { fullName, groupId, notes } = req.body;
      const student = await prisma.student.update({
        where: { id },
        data: { fullName, groupId, notes },
        include: { group: true }
      });
      return res.json(student);
    }

    if (req.method === 'DELETE') {
      // Check access: verify user has permission to delete this student
      const student = await prisma.student.findUnique({
        where: { id },
        include: {
          group: {
            include: {
              collaborators: { select: { teacherId: true } }
            }
          }
        }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Get current user's info
      const currentUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { role: true, school: true }
      });

      if (!currentUser) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Check permission
      let hasPermission = false;

      if (currentUser.role === 'ADMIN') {
        if (!currentUser.school) {
          // Super admin can delete anyone
          hasPermission = true;
        } else {
          // School admin can delete students from their school's teachers
          const studentTeacher = await prisma.user.findUnique({
            where: { id: student.teacherId },
            select: { school: true }
          });
          hasPermission = studentTeacher?.school === currentUser.school;
        }
      } else {
        // Teacher can delete if they own the student OR are a collaborator on the group
        const isOwner = student.teacherId === user.userId;
        const isCollaborator = student.group?.collaborators.some(
          c => c.teacherId === user.userId
        );
        hasPermission = isOwner || (isCollaborator || false);
      }

      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied: You do not have permission to delete this student' });
      }

      // Delete the student
      await prisma.student.delete({ where: { id } });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Student error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
