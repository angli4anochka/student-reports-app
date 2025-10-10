// Vercel serverless function entry point
import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url } = req;
  console.log('Request:', req.method, url);

  try {
    // Test database connection
    if (url === '/api/test-db') {
      await prisma.$connect();
      const userCount = await prisma.user.count();
      return res.json({ 
        status: 'Database connected successfully!', 
        userCount,
        dbUrl: process.env.DATABASE_URL ? 'Set' : 'Not set' 
      });
    }

    // Health check
    if (url === '/api/health') {
      return res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        database: 'Connected'
      });
    }

    // Default API info
    return res.json({ 
      message: 'Student Reports API is running!', 
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      availableEndpoints: ['/api/health', '/api/test-db']
    });

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await prisma.$disconnect();
  }
}