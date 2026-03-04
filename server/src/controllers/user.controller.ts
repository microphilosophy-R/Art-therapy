import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const listUsers = async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query as any;
  const skip = (Number(page) - 1) * Number(limit);

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true, avatarUrl: true },
    }),
    prisma.user.count(),
  ]);

  res.json({ data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
};

export const updateUser = async (req: Request, res: Response) => {
  const { role } = req.body;
  if (!['ADMIN', 'MEMBER'].includes(role)) {
    return res.status(400).json({ message: 'role must be ADMIN or MEMBER' });
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role },
    select: { id: true, email: true, role: true, firstName: true, lastName: true },
  });
  res.json(user);
};

export const getAdminStats = async (req: Request, res: Response) => {
  const [userCount, therapistCount, appointmentCount] = await Promise.all([
    prisma.user.count(),
    prisma.userCertificate.count({
      where: { type: 'THERAPIST', status: 'APPROVED' },
    }),
    prisma.appointment.count(),
  ]);
  res.json({ userCount, therapistCount, appointmentCount });
};
