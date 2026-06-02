import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface UserPermissions {
  userId: string;
  role: string;
  email: string;
  permissions: string[];
  sessionId?: string;
}

/**
 * RBAC (Role-Based Access Control) Service
 */
export class RBACService {
  private permissionsCache: Map<string, string[]> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 минут кэш

  /**
   * Получение разрешений для роли
   */
  async getRolePermissions(role: string): Promise<string[]> {
    const cacheKey = `role_${role}`;

    // Проверяем кэш
    if (this.permissionsCache.has(cacheKey)) {
      return this.permissionsCache.get(cacheKey)!;
    }

    try {
      const permissions = await prisma.$queryRaw<Array<{ resource: string; action: string }>>`
        SELECT p.resource, p.action
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp."permissionId"
        WHERE rp.role = ${role}
      `;

      const permissionStrings = permissions.map(p => `${p.resource}:${p.action}`);

      // Сохраняем в кэш
      this.permissionsCache.set(cacheKey, permissionStrings);
      setTimeout(() => this.permissionsCache.delete(cacheKey), this.cacheTimeout);

      return permissionStrings;
    } catch (error) {
      console.error('Failed to get role permissions:', error);
      return [];
    }
  }

  /**
   * Получение переопределенных разрешений пользователя
   */
  async getUserPermissionOverrides(userId: string): Promise<{ granted: string[], denied: string[] }> {
    try {
      const overrides = await prisma.$queryRaw<Array<{
        resource: string;
        action: string;
        granted: boolean;
      }>>`
        SELECT p.resource, p.action, up.granted
        FROM user_permissions up
        JOIN permissions p ON p.id = up."permissionId"
        WHERE up."userId" = ${userId}::uuid
          AND (up.expires_at IS NULL OR up.expires_at > NOW())
      `;

      const granted = overrides
        .filter(o => o.granted)
        .map(o => `${o.resource}:${o.action}`);

      const denied = overrides
        .filter(o => !o.granted)
        .map(o => `${o.resource}:${o.action}`);

      return { granted, denied };
    } catch (error) {
      console.error('Failed to get user permission overrides:', error);
      return { granted: [], denied: [] };
    }
  }

  /**
   * Проверка разрешения
   */
  async hasPermission(
    user: UserPermissions,
    resource: string,
    action: string
  ): Promise<boolean> {
    const requiredPermission = `${resource}:${action}`;

    // Админы имеют все права
    if (user.role === 'ADMIN') {
      return true;
    }

    // Получаем разрешения роли
    const rolePermissions = await this.getRolePermissions(user.role);

    // Получаем переопределения пользователя
    const overrides = await this.getUserPermissionOverrides(user.userId);

    // Проверяем отказы (имеют приоритет)
    if (overrides.denied.includes(requiredPermission)) {
      return false;
    }

    // Проверяем явные разрешения
    if (overrides.granted.includes(requiredPermission)) {
      return true;
    }

    // Проверяем разрешения роли
    return rolePermissions.includes(requiredPermission);
  }

  /**
   * Логирование попыток несанкционированного доступа
   */
  async logUnauthorizedAccess(
    user: UserPermissions | null,
    resource: string,
    action: string,
    req: Request
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO security_logs (
          type,
          severity,
          "userId",
          ip_address,
          details
        ) VALUES (
          'unauthorized_access',
          'medium',
          ${user?.userId || null}::uuid,
          ${req.ip},
          ${JSON.stringify({
            resource,
            action,
            path: req.path,
            method: req.method,
            userRole: user?.role || 'anonymous',
            timestamp: new Date().toISOString()
          })}::jsonb
        )
      `;
    } catch (error) {
      console.error('Failed to log unauthorized access:', error);
    }
  }
}

/**
 * Middleware для проверки аутентификации
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Получаем токен из заголовка
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    // Проверяем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Проверяем сессию в базе
    const session = await prisma.$queryRaw<Array<{
      id: string;
      userId: string;
      is_active: boolean;
      expires_at: Date;
    }>>`
      SELECT id, "userId", is_active, expires_at
      FROM sessions
      WHERE token = ${token}
        AND is_active = true
        AND expires_at > NOW()
    `;

    if (session.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Получаем данные пользователя
    const user = await prisma.$queryRaw<Array<{
      id: string;
      email: string;
      role: string;
    }>>`
      SELECT id, email, role
      FROM users
      WHERE id = ${decoded.userId}::uuid
    `;

    if (user.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Добавляем данные пользователя в запрос
    (req as any).user = {
      userId: user[0].id,
      email: user[0].email,
      role: user[0].role,
      sessionId: session[0].id,
      permissions: []
    };

    // Обновляем время последней активности сессии
    await prisma.$executeRaw`
      UPDATE sessions
      SET updated_at = NOW()
      WHERE id = ${session[0].id}::uuid
    `;

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware для авторизации (проверка прав)
 */
export const authorize = (resource: string, action: string) => {
  const rbac = new RBACService();

  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as UserPermissions;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasPermission = await rbac.hasPermission(user, resource, action);

    if (!hasPermission) {
      await rbac.logUnauthorizedAccess(user, resource, action, req);
      return res.status(403).json({
        error: 'Forbidden',
        message: `You don't have permission to ${action} ${resource}`
      });
    }

    next();
  };
};

/**
 * Middleware для проверки множественных разрешений
 */
export const authorizeAny = (permissions: Array<{ resource: string; action: string }>) => {
  const rbac = new RBACService();

  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as UserPermissions;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    for (const perm of permissions) {
      const hasPermission = await rbac.hasPermission(user, perm.resource, perm.action);
      if (hasPermission) {
        return next();
      }
    }

    await rbac.logUnauthorizedAccess(user, 'multiple', 'any', req);
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Insufficient permissions'
    });
  };
};

/**
 * Session Manager для безопасного управления сессиями
 */
export class SessionManager {
  private readonly sessionTimeout = 24 * 60 * 60 * 1000; // 24 часа
  private readonly refreshTimeout = 7 * 24 * 60 * 60 * 1000; // 7 дней

  /**
   * Создание новой сессии
   */
  async createSession(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ token: string; refreshToken: string }> {
    // Генерируем токены
    const token = jwt.sign(
      { userId, sessionId: crypto.randomUUID() },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' } // 30 days instead of 24 hours
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_SECRET!,
      { expiresIn: '90d' } // 90 days instead of 7 days
    );

    // Сохраняем в базу
    await prisma.$executeRaw`
      INSERT INTO sessions (
        "userId",
        token,
        refresh_token,
        ip_address,
        user_agent,
        expires_at,
        refresh_expires_at
      ) VALUES (
        ${userId}::uuid,
        ${token},
        ${refreshToken},
        ${ipAddress},
        ${userAgent},
        ${new Date(Date.now() + this.sessionTimeout)},
        ${new Date(Date.now() + this.refreshTimeout)}
      )
    `;

    // Деактивируем старые сессии (опционально)
    await this.cleanupOldSessions(userId);

    return { token, refreshToken };
  }

  /**
   * Обновление токена
   */
  async refreshSession(refreshToken: string): Promise<{ token: string } | null> {
    try {
      // Проверяем refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;

      if (decoded.type !== 'refresh') {
        return null;
      }

      // Проверяем сессию
      const session = await prisma.$queryRaw<Array<{
        id: string;
        userId: string;
      }>>`
        SELECT id, "userId"
        FROM sessions
        WHERE refresh_token = ${refreshToken}
          AND is_active = true
          AND refresh_expires_at > NOW()
      `;

      if (session.length === 0) {
        return null;
      }

      // Генерируем новый токен
      const newToken = jwt.sign(
        { userId: session[0].userId, sessionId: session[0].id },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' } // 30 days instead of 24 hours
      );

      // Обновляем токен в базе
      await prisma.$executeRaw`
        UPDATE sessions
        SET token = ${newToken},
            expires_at = ${new Date(Date.now() + this.sessionTimeout)},
            updated_at = NOW()
        WHERE id = ${session[0].id}::uuid
      `;

      return { token: newToken };
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return null;
    }
  }

  /**
   * Завершение сессии
   */
  async terminateSession(sessionId: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE sessions
      SET is_active = false,
          updated_at = NOW()
      WHERE id = ${sessionId}::uuid
    `;
  }

  /**
   * Завершение всех сессий пользователя
   */
  async terminateAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    if (exceptSessionId) {
      await prisma.$executeRaw`
        UPDATE sessions
        SET is_active = false,
            updated_at = NOW()
        WHERE "userId" = ${userId}::uuid
          AND id != ${exceptSessionId}::uuid
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE sessions
        SET is_active = false,
            updated_at = NOW()
        WHERE "userId" = ${userId}::uuid
      `;
    }
  }

  /**
   * Очистка старых сессий
   */
  private async cleanupOldSessions(userId: string): Promise<void> {
    // Оставляем только последние 5 активных сессий
    await prisma.$executeRaw`
      WITH ranked_sessions AS (
        SELECT id,
               ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
        FROM sessions
        WHERE "userId" = ${userId}::uuid
          AND is_active = true
      )
      UPDATE sessions
      SET is_active = false
      WHERE id IN (
        SELECT id FROM ranked_sessions WHERE rn > 5
      )
    `;
  }
}

/**
 * Middleware для проверки 2FA (опционально)
 */
export const require2FA = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Проверяем, включен ли 2FA для пользователя
  const twoFactorEnabled = await prisma.$queryRaw<Array<{ two_factor_enabled: boolean }>>`
    SELECT two_factor_enabled
    FROM users
    WHERE id = ${user.userId}::uuid
  `;

  if (twoFactorEnabled[0]?.two_factor_enabled) {
    const twoFactorToken = req.headers['x-2fa-token'];

    if (!twoFactorToken) {
      return res.status(403).json({
        error: '2FA Required',
        message: 'Two-factor authentication token required'
      });
    }

    // Здесь должна быть проверка 2FA токена
    // Например, через TOTP (Google Authenticator)
  }

  next();
};