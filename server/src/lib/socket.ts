import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { redis } from './redis';

interface AccessTokenPayload {
  sub: string;
  jti: string;
}

let ioRef: SocketIOServer | null = null;

const extractToken = (authHeader?: string, handshakeToken?: string): string | null => {
  if (handshakeToken) return handshakeToken;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
};

export const initSocketServer = (httpServer: HttpServer, clientUrl: string) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: clientUrl,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = extractToken(
        socket.handshake.headers.authorization as string | undefined,
        socket.handshake.auth?.token as string | undefined,
      );

      if (!token) return next(new Error('Unauthorized'));
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AccessTokenPayload;

      const blacklisted = await redis.get(`blacklist:${payload.jti}`);
      if (blacklisted) return next(new Error('Unauthorized'));

      socket.data.userId = payload.sub;
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
  });

  ioRef = io;
  return io;
};

export const getSocketServer = () => ioRef;
