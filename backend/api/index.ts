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

  const { query } = req;
  console.log('Request:', req.method, req.url, 'Query:', query);

  try {
    // Test database connection with query parameter
    if (query.test === 'db') {
      await prisma.$connect();
      console.log('Database connected');
      
      let userCount = 0;
      let tablesExist = false;
      
      try {
        userCount = await prisma.user.count();
        tablesExist = true;
      } catch (error) {
        console.log('Tables not created yet, need migrations');
      }

      return res.json({ 
        status: 'Database connected successfully!', 
        userCount,
        tablesExist,
        dbUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
        timestamp: new Date().toISOString()
      });
    }

    // Health check with query parameter
    if (query.check === 'health') {
      return res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        database: process.env.DATABASE_URL ? 'Configured' : 'Not configured'
      });
    }

    // Default API info
    return res.json({ 
      message: 'Student Reports API is running!', 
      version: '3.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      testEndpoints: [
        '/api?check=health',
        '/api?test=db'
      ],
      deploymentCheck: 'Force update 3.0.0 - ' + Date.now()
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'API error',
      message: error instanceof Error ? error.message : 'Unknown error',
      dbUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
    });
  }
}