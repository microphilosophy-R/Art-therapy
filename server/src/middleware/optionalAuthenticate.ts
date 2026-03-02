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
  approvedCertificates?: string[];
}

/**
 * Like `authenticate`, but does NOT return 401 when no token is present.
 * Sets req.user if a valid token is provided; leaves req.user undefined otherwise.
 * Useful for routes that are public but show extra data to authenticated users.
 */
export const optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AccessTokenPayload;

    const blacklisted = await redis.get(`blacklist:${payload.jti}`);
    if (!blacklisted) {
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role as any,
        firstName: payload.firstName,
        lastName: payload.lastName,
        approvedCertificates: payload.approvedCertificates as any,
      };
    }
  } catch {
    // Invalid token — treat as unauthenticated, don't block the request
  }
  next();
};
