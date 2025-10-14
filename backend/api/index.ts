// Simple Vercel serverless handler
import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;

  // Set CORS headers
  if (origin && (origin.includes('.vercel.app') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract path, removing query params
  const fullUrl = req.url || '/';
  const path = fullUrl.split('?')[0];
  console.log('Request:', req.method, fullUrl, 'Path:', path);

  try {
    // Root endpoint
    if (path === '/api' || path === '/api/') {
      return res.json({
        message: 'Student Reports API',
        version: '6.0.0',
        timestamp: new Date().toISOString()
      });
    }

    // Health check
    if (path === '/api/health' || path.includes('/health')) {
      return res.json({
        status: 'OK',
        timestamp: new Date().toISOString()
      });
    }

    // Database test
    if (path === '/api/db' || path === '/api/test-db' || fullUrl.includes('?db')) {
      const userCount = await prisma.user.count();
      return res.json({
        status: 'Database connected',
        userCount,
        timestamp: new Date().toISOString()
      });
    }

    // Login endpoint
    if (path === '/api/auth/login' && req.method === 'POST') {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          password: true
        }
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const { password: _, ...userWithoutPassword } = user;

      return res.json({
        token,
        user: userWithoutPassword
      });
    }

    // Not found
    return res.status(404).json({ error: 'Not found', path });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
