import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;

  // CORS headers
  if (origin && (origin.includes('.vercel.app') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract actual path from Vercel rewrites
  const urlParams = new URLSearchParams((req.url || '').split('?')[1] || '');
  const rewritePath = urlParams.get('path');
  const actualPath = rewritePath ? `/api/${rewritePath}` : (req.url || '').split('?')[0];

  console.log('Request URL:', req.url);
  console.log('Rewrite path:', rewritePath);
  console.log('Actual path:', actualPath);

  try {
    // Root
    if (actualPath === '/api' || actualPath === '/api/') {
      return res.json({
        message: 'Student Reports API',
        version: '6.0.0',
        timestamp: new Date().toISOString()
      });
    }

    // Health
    if (actualPath.includes('health')) {
      return res.json({ status: 'OK', timestamp: new Date().toISOString() });
    }

    // Database test
    if (actualPath.includes('db') || actualPath.includes('test-db')) {
      const userCount = await prisma.user.count();
      return res.json({ status: 'Database connected', userCount, timestamp: new Date().toISOString() });
    }

    // Login
    if (actualPath.includes('auth/login') && req.method === 'POST') {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, fullName: true, role: true, password: true }
      });

      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const { password: _, ...userWithoutPassword } = user;
      return res.json({ token, user: userWithoutPassword });
    }

    return res.status(404).json({ error: 'Not found', path: actualPath, url: req.url });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
