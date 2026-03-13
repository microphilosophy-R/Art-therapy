import { Request, Response, NextFunction } from 'express';
import { CertificateType } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const requireCertificate = (certType: CertificateType | readonly CertificateType[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      if (user.role !== 'MEMBER') return next();

      const requiredCerts = Array.isArray(certType) ? [...certType] : [certType];
      if (requiredCerts.some((required) => user.approvedCertificates?.includes(required))) {
        return next();
      }

      const profile = await prisma.userProfile.findUnique({
        where: { userId: user.id },
        select: {
          certificates: {
            where: { type: { in: requiredCerts }, status: 'APPROVED' },
            select: { type: true },
            take: requiredCerts.length,
          },
        },
      });

      if (profile?.certificates?.length) {
        user.approvedCertificates = Array.from(
          new Set([...(user.approvedCertificates ?? []), ...profile.certificates.map((cert) => cert.type)])
        ) as any;
        return next();
      }

      const certLabel = requiredCerts.join(' or ');
      return res.status(403).json({ message: `Requires approved ${certLabel} certificate` });
    } catch (error) {
      console.error('Certificate check failed:', error);
      return res.status(500).json({ message: 'Failed to verify certificate access' });
    }
  };
