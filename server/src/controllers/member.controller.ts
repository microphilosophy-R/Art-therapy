import { Request, Response } from 'express';
import type { CertificateStatus, CertificateType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { uploadAsset } from '../services/upload.service';

const ADMIN_CERT_TYPES = ['COUNSELOR', 'THERAPIST', 'ARTIFICER'] as const;
const ADMIN_CERT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED'] as const;
const ADMIN_CERT_ACTIONS = ['APPROVE', 'REJECT', 'REVOKE', 'RESET_TO_PENDING'] as const;

const parseAdminEnumQuery = <T extends readonly string[]>(
  raw: unknown,
  allowed: T
): T[number][] | null => {
  if (typeof raw !== 'string') return [];
  const normalized = raw.trim();
  if (!normalized || normalized.toUpperCase() === 'ALL') return [];

  const values = normalized
    .split(',')
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);

  const invalid = values.find((v) => !(allowed as readonly string[]).includes(v));
  if (invalid) return null;

  return [...new Set(values)] as T[number][];
};

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

export const listPendingCertificates = async (req: Request, res: Response) => {
  const statusFilters = parseAdminEnumQuery(req.query.status, ADMIN_CERT_STATUSES);
  if (statusFilters === null) {
    return res.status(400).json({
      message: `Invalid status. Allowed values: ${ADMIN_CERT_STATUSES.join(', ')}, ALL`,
    });
  }

  const typeFilters = parseAdminEnumQuery(req.query.type, ADMIN_CERT_TYPES);
  if (typeFilters === null) {
    return res.status(400).json({
      message: `Invalid type. Allowed values: ${ADMIN_CERT_TYPES.join(', ')}, ALL`,
    });
  }

  const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  const certs = await prisma.userCertificate.findMany({
    where: {
      ...(statusFilters.length
        ? { status: { in: statusFilters as CertificateStatus[] } }
        : {}),
      ...(typeFilters.length ? { type: { in: typeFilters as CertificateType[] } } : {}),
      ...(search
        ? {
          OR: [
            { profile: { user: { firstName: { contains: search, mode: 'insensitive' } } } },
            { profile: { user: { lastName: { contains: search, mode: 'insensitive' } } } },
            { profile: { user: { email: { contains: search, mode: 'insensitive' } } } },
          ],
        }
        : {}),
    },
    include: { profile: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } } },
    orderBy: [{ appliedAt: 'desc' }],
  });
  return res.json(certs);
};

export const reviewCertificate = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, rejectionReason } = req.body as { action?: string; rejectionReason?: string };
  if (!action || !ADMIN_CERT_ACTIONS.includes(action as (typeof ADMIN_CERT_ACTIONS)[number])) {
    return res.status(400).json({
      message: `action must be one of: ${ADMIN_CERT_ACTIONS.join(', ')}`,
    });
  }

  const cert = await prisma.userCertificate.findUnique({ where: { id } });
  if (!cert) {
    return res.status(404).json({ message: 'Certificate not found' });
  }

  if (action === 'REVOKE' && cert.status !== 'APPROVED') {
    return res.status(400).json({ message: 'Only approved certificates can be revoked' });
  }
  if (action === 'RESET_TO_PENDING' && cert.status === 'PENDING') {
    return res.status(400).json({ message: 'Certificate is already pending' });
  }
  if (action === 'APPROVE' && cert.status === 'APPROVED') {
    return res.status(400).json({ message: 'Certificate is already approved' });
  }
  if (action === 'REJECT' && cert.status === 'REJECTED') {
    return res.status(400).json({ message: 'Certificate is already rejected' });
  }

  if (action === 'APPROVE') {
    const updated = await prisma.userCertificate.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });
    return res.json(updated);
  }

  if (action === 'REJECT') {
    const updated = await prisma.userCertificate.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        rejectionReason: rejectionReason?.trim() || null,
      },
    });
    return res.json(updated);
  }

  if (action === 'REVOKE') {
    const updated = await prisma.userCertificate.update({
      where: { id },
      data: {
        status: 'REVOKED',
        reviewedAt: new Date(),
        rejectionReason: rejectionReason?.trim() || null,
      },
    });
    return res.json(updated);
  }

  const updated = await prisma.userCertificate.update({
    where: { id },
    data: {
      status: 'PENDING',
      appliedAt: new Date(),
      reviewedAt: null,
      rejectionReason: null,
    },
  });
  return res.json(updated);
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
              where: { status: { in: ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED'] } },
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
