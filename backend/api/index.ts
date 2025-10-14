import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';

  // Health check
  if (url.includes('health')) {
    return res.json({ status: 'OK', timestamp: new Date().toISOString() });
  }

  // Database test
  if (url.includes('test-db') || url.includes('db')) {
    try {
      const userCount = await prisma.user.count();
      return res.json({
        status: 'Database connected',
        userCount,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Database connection failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.json({
    message: 'Student Reports API',
    version: '7.0.0',
    timestamp: new Date().toISOString()
  });
}
