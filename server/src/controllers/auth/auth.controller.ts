import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import type { RegisterInput, LoginInput } from '../../schemas/auth.schemas';

const ACCESS_SECRET = () => process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = () => process.env.JWT_REFRESH_SECRET!;
const ACCESS_TTL = () => process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
const REFRESH_TTL_DAYS = 7;

const hasJwtConfig = () => Boolean(process.env.JWT_ACCESS_SECRET && process.env.JWT_REFRESH_SECRET);

const getApprovedCertificatesByUserId = async (userId: string): Promise<string[]> => {
  try {
    const certificates = await prisma.userCertificate.findMany({
      where: {
        profile: { userId },
        status: 'APPROVED',
      },
      select: { type: true },
    });
    return certificates.map((cert) => cert.type);
  } catch (error) {
    // Keep login resilient even if profile/certificate tables are temporarily inconsistent.
    console.error('[Auth] Failed to load approved certificates during login:', error);
    return [];
  }
};

const toAuthUser = (user: any, approvedCertificates: string[] = []) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  avatarUrl: user.avatarUrl ?? undefined,
  createdAt: user.createdAt,
  approvedCertificates,
});

const signAccess = (user: { id: string; email: string; role: string; firstName: string; lastName: string; approvedCertificates?: string[] }) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      jti: uuidv4(),
      approvedCertificates: user.approvedCertificates
    },
    ACCESS_SECRET(),
    { expiresIn: ACCESS_TTL() as any }
  );

const signRefresh = (userId: string) =>
  jwt.sign({ sub: userId, jti: uuidv4() }, REFRESH_SECRET(), { expiresIn: `${REFRESH_TTL_DAYS}d` });

export const register = async (req: Request, res: Response) => {
  if (!hasJwtConfig()) {
    return res.status(500).json({ message: 'Server auth configuration error: missing JWT secrets' });
  }

  const body = req.body as RegisterInput;
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) return res.status(409).json({ message: 'Email already registered' });

  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      firstName: body.firstName,
      lastName: body.lastName,
      role: 'MEMBER',
      phone: body.phone,
    },
  });

  await prisma.userProfile.create({ data: { userId: user.id } });

  const accessToken = signAccess(user);
  const refreshToken = signRefresh(user.id);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    accessToken,
    user: toAuthUser(user, []),
  });
};

export const login = async (req: Request, res: Response) => {
  try {
    if (!hasJwtConfig()) {
      return res.status(500).json({ message: 'Server auth configuration error: missing JWT secrets' });
    }

    const { email, password } = req.body as LoginInput;
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    if (!user.passwordHash) {
      console.error('User missing passwordHash:', user.email);
      return res.status(500).json({ message: 'Account configuration error' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const approvedCertificates = await getApprovedCertificatesByUserId(user.id);

    const accessToken = signAccess({ ...user, approvedCertificates });
    const refreshToken = signRefresh(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken,
      user: toAuthUser(user, approvedCertificates),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  if (!hasJwtConfig()) {
    return res.status(500).json({ message: 'Server auth configuration error: missing JWT secrets' });
  }

  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ message: 'No refresh token' });

  try {
    const payload = jwt.verify(token, REFRESH_SECRET()) as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userProfile: {
          include: { certificates: true }
        }
      }
    });
    if (!user) return res.status(401).json({ message: 'User not found' });

    const approvedCertificates = await getApprovedCertificatesByUserId(user.id);

    const accessToken = signAccess({ ...user, approvedCertificates });
    res.json({
      accessToken,
      user: toAuthUser(user, approvedCertificates),
    });
  } catch {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.decode(token) as { jti?: string; exp?: number };
      if (payload?.jti && payload?.exp) {
        const ttl = payload.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) await redis.set(`blacklist:${payload.jti}`, '1', 'EX', ttl);
      }
    } catch { /* ignore */ }
  }

  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
};

export const getMe = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      userProfile: { include: { certificates: true } },
    },
  });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const approvedCertificates =
    user.userProfile?.certificates
      ?.filter((cert: any) => cert.status === 'APPROVED')
      .map((cert: any) => cert.type) ?? [];

  const { passwordHash: _, ...safeUser } = user;
  res.json({ ...safeUser, approvedCertificates });
};

