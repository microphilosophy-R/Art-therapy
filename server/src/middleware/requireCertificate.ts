import { Request, Response, NextFunction } from 'express';
import { CertificateType } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const requireCertificate = (certType: CertificateType) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user?.role !== 'MEMBER') return next();

      if (req.user.approvedCertificates?.includes(certType)) return next();

      const profile = await prisma.userProfile.findUnique({
        where: { userId: req.user.id },
        select: {
          certificates: {
            where: { type: certType, status: 'APPROVED' },
            select: { type: true },
            take: 1,
          },
        },
      });

      if (profile?.certificates?.length) {
        req.user.approvedCertificates = Array.from(
          new Set([...(req.user.approvedCertificates ?? []), certType])
        ) as any;
        return next();
      }

      return res.status(403).json({ message: `Requires approved ${certType} certificate` });
    } catch (error) {
      console.error('Certificate check failed:', error);
      return res.status(500).json({ message: 'Failed to verify certificate access' });
    }
  };
