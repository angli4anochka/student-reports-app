import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

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
