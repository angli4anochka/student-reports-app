// Catch-all Vercel serverless handler for all API routes
import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

// Configure CORS for all Vercel deployments
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // Allow all Vercel deployments and localhost
    if (
      origin.includes('.vercel.app') ||
      origin.includes('localhost')
    ) {
      return callback(null, true);
    }

    // Block other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/criteria', criteriaRoutes);
app.use('/api/years', yearRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', importRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    cors: 'enabled for all .vercel.app domains'
  });
});

// Root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Student Reports API is running!',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Export for Vercel serverless (catch-all handler)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers explicitly for preflight
  const origin = req.headers.origin;
  if (origin && (origin.includes('.vercel.app') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Pass to Express app
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
