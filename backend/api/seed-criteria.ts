import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;
  if (origin && (origin.includes('.vercel.app') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Adding default criteria...');

    const criteria = [
      { name: 'Активность на уроке', weight: 1, scale: '1-4', order: 1 },
      { name: 'Вовлечённость', weight: 1, scale: '1-4', order: 2 },
      { name: 'Выполнение д/з', weight: 1, scale: '1-4', order: 3 },
      { name: 'Чтение', weight: 1, scale: '1-4', order: 4 },
      { name: 'Грамматика', weight: 1, scale: '1-4', order: 5 },
      { name: 'Говорение', weight: 1, scale: '1-4', order: 6 },
    ];

    const results = [];

    for (const criterion of criteria) {
      const existing = await prisma.criterion.findFirst({
        where: { name: criterion.name }
      });

      if (!existing) {
        const created = await prisma.criterion.create({ data: criterion });
        results.push({ action: 'created', criterion: created });
      } else {
        results.push({ action: 'exists', criterion: existing });
      }
    }

    return res.json({
      success: true,
      message: 'Criteria seeded successfully',
      results
    });
  } catch (error) {
    console.error('Seed criteria error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
