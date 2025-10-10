// Vercel serverless function entry point
import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
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

  // Route handling
  if (url === '/api' || url === '/') {
    return res.json({ 
      message: 'Student Reports API is running!', 
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  }

  if (url === '/api/health') {
    return res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production'
    });
  }

  if (url === '/api/test' && req.method === 'POST') {
    return res.json({ 
      message: 'POST request working', 
      body: req.body,
      method: req.method
    });
  }

  if (url === '/api/test-db') {
    return res.json({ 
      status: 'Database connection disabled for testing', 
      dbUrl: process.env.DATABASE_URL ? 'Set' : 'Not set' 
    });
  }

  // 404 handler
  res.status(404).json({ 
    error: 'Route not found', 
    path: url,
    availableRoutes: ['/api', '/api/health', '/api/test-db', '/api/test']
  });
}