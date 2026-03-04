import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { uploadAsset } from '../services/upload.service';

export const applyCertificate = async (req: Request, res: Response) => {
  try {
    const { type, isDraft } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

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

    const fileUrls: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const safeId = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.originalname}`;
        const url = await uploadAsset(file.buffer, 'therapist-cert', safeId);
        fileUrls.push(url);
      }
    }

    // Current enum does not support DRAFT for certificates; keep as PENDING.
    const status = 'PENDING';
    const cert = await prisma.userCertificate.upsert({
      where: { profileId_type: { profileId: profile.id, type } },
      create: { profileId: profile.id, type, status, certificateUrls: fileUrls },
      update: {
        status,
        rejectionReason: null,
        appliedAt: status === 'PENDING' ? new Date() : undefined,
        reviewedAt: null,
        certificateUrls: fileUrls
      },
    });

    res.status(201).json(cert);
  } catch (error) {
    console.error('Apply certificate error:', error);
    res.status(500).json({ message: 'Failed to process certificate application' });
  }
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

export const getMemberReviewStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userProfile: {
          include: {
            therapyPlans: {
              where: { status: { in: ['PENDING_REVIEW', 'REJECTED'] } },
              select: { id: true, title: true, status: true, submittedAt: true, rejectionReason: true }
            },
            products: {
              where: { status: { in: ['PENDING_REVIEW', 'REJECTED'] } },
              select: { id: true, title: true, status: true, submittedAt: true, rejectionReason: true }
            },
            certificates: {
              where: { status: { in: ['PENDING', 'REJECTED'] } },
              select: { type: true, status: true, appliedAt: true, rejectionReason: true }
            }
          }
        }
      }
    });

    const profile = user?.userProfile?.profileStatus === 'PENDING_REVIEW' || user?.userProfile?.profileStatus === 'REJECTED'
      ? { status: user.userProfile.profileStatus, submittedAt: user.userProfile.submittedAt, rejectionReason: user.userProfile.rejectionReason }
      : undefined;

    res.json({
      profile,
      plans: user?.userProfile?.therapyPlans || [],
      products: user?.userProfile?.products || [],
      certificates: user?.userProfile?.certificates || []
    });
  } catch (error) {
    console.error('Get member review status error:', error);
    res.status(500).json({ error: 'Failed to fetch review status' });
  }
};
