// Universal Vercel serverless handler for ALL API routes
import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

import authRoutes from '../src/routes/auth';
import studentRoutes from '../src/routes/students';
import gradeRoutes from '../src/routes/grades';
import criteriaRoutes from '../src/routes/criteria';
import yearRoutes from '../src/routes/years';
import groupRoutes from '../src/routes/groups';
import exportRoutes from '../src/routes/export';
import importRoutes from '../src/routes/import';

// Initialize Express app
const app = express();
const prisma = new PrismaClient();

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.includes('.vercel.app') || origin.includes('localhost')) {
      return callback(null, true);
    }
    callback(null, false);
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// Mount all routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/criteria', criteriaRoutes);
app.use('/api/years', yearRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', importRoutes);

// Health endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Student Reports API is running!',
    version: '5.0.0',
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// Database test endpoint
app.get('/api/db', async (req, res) => {
  try {
    await prisma.$connect();
    const userCount = await prisma.user.count();
    res.json({
      status: 'SUCCESS: Database connected!',
      userCount,
      timestamp: new Date().toISOString(),
      message: 'Supabase PostgreSQL connection working!'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR: Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Vercel serverless handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;

  console.log('Handler:', req.method, req.url, 'Origin:', origin);

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
    console.log('OPTIONS preflight handled');
    return res.status(200).end();
  }

  // Pass to Express
  return new Promise((resolve, reject) => {
    app(req as any, res as any, (err: any) => {
      if (err) {
        console.error('Express error:', err);
        reject(err);
      } else {
        resolve(undefined);
      }
    });
  });
}

export { app, prisma };
