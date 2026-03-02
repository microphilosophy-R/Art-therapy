import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const applyCertificate = async (req: Request, res: Response) => {
  const { type } = req.body;
  const validTypes = ['COUNSELOR', 'THERAPIST', 'ARTIFICER'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ message: 'Invalid certificate type' });
  }

  const profile = await prisma.userProfile.findUnique({ where: { userId: req.user!.id } });
  if (!profile) return res.status(404).json({ message: 'Profile not found' });

  const existing = await prisma.userCertificate.findUnique({
    where: { profileId_type: { profileId: profile.id, type } },
  });
  if (existing && ['PENDING', 'APPROVED'].includes(existing.status)) {
    return res.status(409).json({ message: 'Certificate already applied or approved' });
  }

  const cert = await prisma.userCertificate.upsert({
    where: { profileId_type: { profileId: profile.id, type } },
    create: { profileId: profile.id, type, status: 'PENDING' },
    update: { status: 'PENDING', rejectionReason: null, appliedAt: new Date(), reviewedAt: null },
  });

  res.status(201).json(cert);
};

export const getCertificates = async (req: Request, res: Response) => {
  const profile = await prisma.userProfile.findUnique({
    where: { userId: req.user!.id },
    include: { certificates: true },
  });
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  res.json(profile.certificates);
};

export const listPendingCertificates = async (_req: Request, res: Response) => {
  const certs = await prisma.userCertificate.findMany({
    where: { status: 'PENDING' },
    include: { profile: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } } },
    orderBy: { appliedAt: 'asc' },
  });
  res.json(certs);
};

export const reviewCertificate = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, rejectionReason } = req.body;
  if (!['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).json({ message: 'action must be APPROVE or REJECT' });
  }

  const cert = await prisma.userCertificate.findUnique({ where: { id } });
  if (!cert || cert.status !== 'PENDING') {
    return res.status(404).json({ message: 'Pending certificate not found' });
  }

  const updated = await prisma.userCertificate.update({
    where: { id },
    data: {
      status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      reviewedAt: new Date(),
      rejectionReason: action === 'REJECT' ? rejectionReason : null,
    },
  });
  res.json(updated);
};
