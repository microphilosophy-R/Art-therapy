import { Request, Response, NextFunction } from 'express';
import { CertificateType } from '@prisma/client';

export const requireCertificate = (certType: CertificateType) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role === 'MEMBER') {
      if (!req.user.approvedCertificates?.includes(certType)) {
        return res.status(403).json({ message: `Requires approved ${certType} certificate` });
      }
    }
    next();
  };
