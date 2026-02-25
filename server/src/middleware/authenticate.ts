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

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AccessTokenPayload;

    // Check token blacklist
    const blacklisted = await redis.get(`blacklist:${payload.jti}`);
    if (blacklisted) {
      return res.status(401).json({ message: 'Token has been revoked' });
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role as any,
      firstName: payload.firstName,
      lastName: payload.lastName,
    };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
