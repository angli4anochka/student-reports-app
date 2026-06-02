import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

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

    // GET /lessons - list lessons with filters
    if (!id && req.method === 'GET') {
      const { groupId } = req.query;

      // Get current user's info
      const currentUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { role: true, school: true }
      });

      if (!currentUser) {
        return res.status(401).json({ error: 'User not found' });
      }

      let lessons;

      // Build WHERE clause based on role
      const where: any = {};

      if (currentUser.role === 'ADMIN') {
        if (currentUser.school) {
          // School admin sees lessons from all teachers in their school
          const schoolTeachers = await prisma.user.findMany({
            where: { school: currentUser.school },
            select: { id: true }
          });
          where.teacherId = { in: schoolTeachers.map(t => t.id) };
        }
        // Super admin (no school) sees ALL lessons - no filter needed

        // Apply group filter if specified
        if (groupId) {
          where.groupId = groupId as string;
        }
      } else {
        // Teacher sees:
        // 1. Their own lessons
        // 2. Lessons from groups they own
        // 3. Lessons from groups they collaborate on

        // Find groups where user is owner
        const ownedGroups = await prisma.group.findMany({
          where: { teacherId: user.userId },
          select: { id: true }
        });
        const ownedGroupIds = ownedGroups.map(g => g.id);

        // Find groups where user is collaborator
        const sharedGroups = await prisma.groupTeacher.findMany({
          where: { teacherId: user.userId },
          select: { groupId: true }
        });
        const sharedGroupIds = sharedGroups.map(g => g.groupId);

        // Combine both lists
        const allAccessibleGroupIds = [...ownedGroupIds, ...sharedGroupIds];

        // Filter: teacherId is current user OR groupId is in accessible groups
        if (groupId) {
          // If filtering by specific group, check if user has access to it
          const hasAccessToGroup = allAccessibleGroupIds.includes(groupId as string);
          if (hasAccessToGroup) {
            // User has access to this group - show all lessons in it
            where.groupId = groupId as string;
          } else {
            // User only sees lessons they created in this group
            where.AND = [
              { teacherId: user.userId },
              { groupId: groupId as string }
            ];
          }
        } else {
          // No group filter - show all accessible lessons
          if (allAccessibleGroupIds.length > 0) {
            where.OR = [
              { teacherId: user.userId },
              { groupId: { in: allAccessibleGroupIds } }
            ];
          } else {
            where.teacherId = user.userId;
          }
        }
      }

      lessons = await prisma.lesson.findMany({
        where,
        include: {
          group: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          student: {
            select: {
              id: true,
              fullName: true
            }
          }
        },
        orderBy: { date: 'desc' }
      });

      return res.json(lessons);
    }

    // POST /lessons - create lesson
    if (!id && req.method === 'POST') {
      try {
        const { date, topic, homework, comment, groupId, studentId, lessonPlan, time, notificationDate } = req.body;
        console.log('Creating lesson:', { date, topic, homework, comment, groupId, studentId, lessonPlan, time, notificationDate, userId: user.userId });

        if (!date || !topic) {
          return res.status(400).json({ error: 'Date and topic are required' });
        }

        const finalGroupId = groupId && groupId !== '' ? groupId : null;
        const finalStudentId = studentId && studentId !== '' ? studentId : null;

        // Create lesson using Prisma (now that schema is updated)
        const lesson = await prisma.lesson.create({
          data: {
            date,
            topic,
            homework: homework || null,
            comment: comment || null,
            lessonPlan: lessonPlan || null,
            time: time || null,
            notificationDate: notificationDate || null,
            teacherId: user.userId,
            groupId: finalGroupId,
            studentId: finalStudentId
          },
          include: {
            group: {
              select: {
                id: true,
                name: true,
                description: true
              }
            },
            student: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        });

        console.log('Lesson created:', lesson);
        return res.status(201).json(lesson);
      } catch (insertError) {
        console.error('Error creating lesson:', insertError);
        throw insertError;
      }
    }

    if (!id) return res.status(400).json({ error: 'Lesson ID required' });

    if (req.method === 'GET') {
      const lesson = await prisma.lesson.findUnique({
        where: { id },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          student: {
            select: {
              id: true,
              fullName: true
            }
          }
        }
      });

      if (!lesson) {
        return res.status(404).json({ error: 'Lesson not found' });
      }
      return res.json(lesson);
    }

    if (req.method === 'PUT') {
      const { date, topic, homework, comment, groupId, studentId, lessonPlan, time, notificationDate } = req.body;
      const finalGroupId = groupId && groupId !== '' ? groupId : null;
      const finalStudentId = studentId && studentId !== '' ? studentId : null;

      // Update lesson using Prisma (now that schema is updated)
      const lesson = await prisma.lesson.update({
        where: { id },
        data: {
          date,
          topic,
          homework: homework || null,
          comment: comment || null,
          lessonPlan: lessonPlan || null,
          time: time || null,
          notificationDate: notificationDate || null,
          groupId: finalGroupId,
          studentId: finalStudentId
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          student: {
            select: {
              id: true,
              fullName: true
            }
          }
        }
      });

      return res.json(lesson);
    }

    if (req.method === 'DELETE') {
      await prisma.lesson.delete({ where: { id } });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Lesson error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('Error type:', error?.constructor?.name);

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}
