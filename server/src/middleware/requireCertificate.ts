import { Request, Response, NextFunction } from 'express';

export const requireCertificate = (certType: string) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role === 'MEMBER') {
      if (!req.user.approvedCertificates?.includes(certType)) {
        return res.status(403).json({ message: `Requires approved ${certType} certificate` });
      }
    }
    next();
  };
