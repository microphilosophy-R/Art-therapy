import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';

export const rateLimiter = (maxRequests = 60, windowSeconds = 60) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const key = `ratelimit:${ip}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }
      if (count > maxRequests) {
        return res.status(429).json({ message: 'Too many requests. Please slow down.' });
      }
    } catch {
      // If Redis is unavailable, allow the request (fail open)
    }
    next();
  };
