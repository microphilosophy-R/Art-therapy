import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { redis } from '../lib/redis';

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  jti: string;
}

/**
 * Like `authenticate`, but does NOT block the request if no token is present.
 * Populates `req.user` when a valid Bearer token is provided; otherwise continues
 * with `req.user` undefined. Used on public routes that need owner-visibility logic.
 */
export const authenticateOptional = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AccessTokenPayload;
    const blacklisted = await redis.get(`blacklist:${payload.jti}`);
    if (blacklisted) return next();

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role as any,
      firstName: payload.firstName,
      lastName: payload.lastName,
    };
  } catch {
    // Invalid token — treat as unauthenticated, don't block
  }
  next();
};
