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
    const slug = req.query.slug as string[] | undefined;
    const id = slug?.[0];

    // GET /criteria - list all criteria
    if (!id && req.method === 'GET') {
      const criteria = await prisma.criterion.findMany({
        orderBy: { order: 'asc' }
      });
      return res.json(criteria);
    }

    // POST /criteria - create criterion
    if (!id && req.method === 'POST') {
      const { name, weight, scale, order } = req.body;
      if (!name || weight === undefined || !scale) {
        return res.status(400).json({ error: 'Name, weight, and scale are required' });
      }
      const criterion = await prisma.criterion.create({
        data: { name, weight, scale, order: order || 0 }
      });
      return res.status(201).json(criterion);
    }

    if (!id) return res.status(400).json({ error: 'Criterion ID required' });

    if (req.method === 'GET') {
      const criterion = await prisma.criterion.findUnique({ where: { id } });
      if (!criterion) return res.status(404).json({ error: 'Criterion not found' });
      return res.json(criterion);
    }

    if (req.method === 'PUT') {
      const { name, weight, scale, order } = req.body;
      const criterion = await prisma.criterion.update({
        where: { id },
        data: { name, weight, scale, order }
      });
      return res.json(criterion);
    }

    if (req.method === 'DELETE') {
      await prisma.criterion.delete({ where: { id } });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Criterion error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
