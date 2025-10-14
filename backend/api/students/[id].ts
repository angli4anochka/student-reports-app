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
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    if (req.method === 'GET') {
      const student = await prisma.student.findUnique({
        where: { id },
        include: { group: true }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

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
      await prisma.student.delete({
        where: { id }
      });

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
