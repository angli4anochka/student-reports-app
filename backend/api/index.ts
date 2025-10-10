// Vercel serverless function entry point
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
// const prisma = new PrismaClient(); // Disabled for now

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  res.json({ status: 'Database connection disabled for testing', dbUrl: process.env.DATABASE_URL ? 'Set' : 'Not set' });
});

// Basic routes for testing
app.get('/api', (req, res) => {
  res.json({ message: 'Student Reports API is running!', version: '1.0.0' });
});

app.post('/api/test', (req, res) => {
  res.json({ message: 'POST request working', body: req.body });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found', 
    path: req.originalUrl,
    availableRoutes: ['/api/health', '/api/test-db', '/api', '/api/test']
  });
});

// Export for Vercel
export default app;