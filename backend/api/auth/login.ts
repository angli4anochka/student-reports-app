// Login endpoint
import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from '../../src/routes/auth';

const app = express();
const prisma = new PrismaClient();

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.includes('.vercel.app') || origin.includes('localhost')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use('/api/auth', authRoutes);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;

  console.log('Login handler:', req.method, 'Origin:', origin);

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
    console.log('OPTIONS preflight handled for login');
    res.status(200).end();
    return;
  }

  // Create a modified request for Express with correct path
  const modifiedReq: any = Object.assign({}, req, {
    url: '/api/auth/login',
    path: '/api/auth/login'
  });

  return new Promise((resolve, reject) => {
    app(modifiedReq, res as any, (err: any) => {
      if (err) {
        console.error('Login route error:', err);
        reject(err);
      } else {
        resolve(undefined);
      }
    });
  });
}

export { prisma };
