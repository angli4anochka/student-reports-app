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

// Combined handler for /data?entity=criteria and /data?entity=teachers
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
    const entity = req.query.entity as string;

    // Route to appropriate handler
    if (entity === 'criteria') {
      return await handleCriteria(req, res, user);
    } else if (entity === 'teachers') {
      return await handleTeachers(req, res, user);
    } else {
      return res.status(400).json({ error: 'Invalid entity parameter. Use ?entity=criteria or ?entity=teachers' });
    }
  } catch (error) {
    console.error('Data API error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Criteria handler
async function handleCriteria(req: VercelRequest, res: VercelResponse, user: any) {
  const id = req.query.id as string | undefined;

  // GET /data?entity=criteria - list all criteria
  if (!id && req.method === 'GET') {
    const criteria = await prisma.criterion.findMany({
      orderBy: { order: 'asc' }
    });
    return res.json(criteria);
  }

  // POST /data?entity=criteria - create new criterion
  if (!id && req.method === 'POST') {
    const { name, weight, scale, order } = req.body;
    if (!name || weight === undefined) {
      return res.status(400).json({ error: 'Name and weight are required' });
    }
    const criterion = await prisma.criterion.create({
      data: { name, weight, scale: scale || 10, order: order || 0 }
    });
    return res.status(201).json(criterion);
  }

  if (!id) return res.status(400).json({ error: 'Criterion ID required for PUT/DELETE' });

  // PUT /data?entity=criteria&id={id} - update criterion
  if (req.method === 'PUT') {
    const { name, weight, scale, order } = req.body;
    const criterion = await prisma.criterion.update({
      where: { id },
      data: { name, weight, scale, order }
    });
    return res.json(criterion);
  }

  // DELETE /data?entity=criteria&id={id} - delete criterion
  if (req.method === 'DELETE') {
    await prisma.criterion.delete({ where: { id } });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Teachers handler
async function handleTeachers(req: VercelRequest, res: VercelResponse, user: any) {
  // GET /data?entity=teachers - list teachers based on role
  if (req.method === 'GET') {
    const userId = user.userId;

    // Get current user's info
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, school: true }
    });

    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    // For teachers - see other teachers from the same school (excluding themselves)
    if (currentUser.role === 'TEACHER') {
      const teachers = await prisma.user.findMany({
        where: {
          school: currentUser.school,
          role: 'TEACHER',
          id: { not: userId } // Exclude current user
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          school: true
        },
        orderBy: { fullName: 'asc' }
      });
      return res.json(teachers);
    }

    // For admins
    if (currentUser.role === 'ADMIN') {
      let teachers;

      if (currentUser.school) {
        // School admin sees teachers from their school
        teachers = await prisma.user.findMany({
          where: {
            school: currentUser.school,
            role: 'TEACHER'
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            school: true
          },
          orderBy: { fullName: 'asc' }
        });
      } else {
        // Super admin (no school) sees all teachers
        teachers = await prisma.user.findMany({
          where: { role: 'TEACHER' },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            school: true
          },
          orderBy: { fullName: 'asc' }
        });
      }

      return res.json(teachers);
    }

    return res.status(403).json({ error: 'Forbidden' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
