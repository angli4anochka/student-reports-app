import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await prisma.$connect();
    console.log('Database connected successfully');
    
    // Try to count users (will work even if table doesn't exist yet)
    let userCount = 0;
    try {
      userCount = await prisma.user.count();
    } catch (error) {
      console.log('User table not found, need to run migrations');
    }

    return res.json({ 
      status: 'Database connected successfully!', 
      userCount,
      dbUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      dbUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
    });
  } finally {
    await prisma.$disconnect();
  }
}