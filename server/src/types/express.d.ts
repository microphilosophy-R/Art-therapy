import { Role, CertificateType } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
        firstName: string;
        lastName: string;
        approvedCertificates?: CertificateType[];
      };
    }
  }
}
