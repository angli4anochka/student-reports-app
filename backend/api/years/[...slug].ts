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

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const user = verifyToken(req);
    const slug = req.query.slug as string[] | undefined;

    // GET /years - list all years
    if (!slug && req.method === 'GET') {
      const years = await prisma.year.findMany({
        orderBy: { year: 'desc' }
      });
      return res.json(years);
    }

    // POST /years - create new year
    if (!slug && req.method === 'POST') {
      const { year, months } = req.body;
      if (!year) return res.status(400).json({ error: 'Year is required' });
      const newYear = await prisma.year.create({
        data: { year, months: months || [], createdBy: user.userId }
      });
      return res.status(201).json(newYear);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Years error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
