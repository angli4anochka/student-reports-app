import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;

  if (origin && (origin.includes('.vercel.app') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action } = req.query;

    // Handle /auth/register endpoint
    if (action === 'register' && req.method === 'POST') {
      return await handleRegister(req, res);
    }

    // Handle /auth/login endpoint
    if (action === 'login' && req.method === 'POST') {
      return await handleLogin(req, res);
    }

    // Handle /auth/change-password endpoint
    if (action === 'change-password' && req.method === 'POST') {
      return await handleChangePassword(req, res);
    }

    // Handle /auth/me endpoint
    if (action === 'me' && req.method === 'GET') {
      return await handleMe(req, res);
    }

    // Handle /auth/forgot-password endpoint
    if (action === 'forgot-password' && req.method === 'POST') {
      return await handleForgotPassword(req, res);
    }

    // Handle /auth/reset-password endpoint
    if (action === 'reset-password' && req.method === 'POST') {
      return await handleResetPassword(req, res);
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Handler for registration
async function handleRegister(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, fullName, school } = req.body;

  // Validation
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Email, password, and full name are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (existingUser) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      fullName,
      school: school || null,
      role: 'TEACHER' // Default role
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      school: true
    }
  });

  // Generate token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return res.status(201).json({ token, user });
}

// Handler for login
async function handleLogin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
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

// Handler for /me (get current user info)
async function handleMe(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  let payload: JWTPayload;

  try {
    payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Get user info from database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      school: true,
      createdAt: true
    }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.status(200).json(user);
}

// Handler for change-password
async function handleChangePassword(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  let payload: JWTPayload;

  try {
    payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  // Get user from database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      password: true
    }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Trim whitespace from passwords to handle copy-paste errors
  const trimmedOldPassword = oldPassword.trim();

  // Verify old password
  const isValidPassword = await bcrypt.compare(trimmedOldPassword, user.password);

  if (!isValidPassword) {
    // Use 400 instead of 401 to avoid automatic logout redirect on frontend
    // 401 should only be used for invalid/expired tokens, not incorrect passwords
    return res.status(400).json({ error: 'Текущий пароль неверный. Проверьте правильность ввода.' });
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 12);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedNewPassword }
  });

  return res.json({ message: 'Password changed successfully' });
}

// Handler for forgot-password
async function handleForgotPassword(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  // Always return success even if user doesn't exist (security best practice)
  if (!user) {
    return res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
  }

  // Generate reset token (random string)
  const crypto = await import('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

  // Save token to database
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiry
    } as any
  });

  // In production, send email here
  // For now, log the reset link
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  console.log('==========================================');
  console.log('PASSWORD RESET LINK:');
  console.log(resetLink);
  console.log('==========================================');

  return res.json({
    message: 'If an account exists with this email, a password reset link has been sent.',
    // Remove in production! Only for development
    resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
  });
}

// Handler for reset-password
async function handleResetPassword(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  // Find user with valid token
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: {
        gt: new Date() // Token not expired
      }
    } as any
  });

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    } as any
  });

  return res.json({ message: 'Password has been reset successfully. You can now login with your new password.' });
}
