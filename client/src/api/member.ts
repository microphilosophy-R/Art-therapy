import api from './axios';

export type CertificateType = 'COUNSELOR' | 'THERAPIST' | 'ARTIFICER';
export type CertificateStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';

export interface UserCertificate {
  id: string;
  type: CertificateType;
  status: CertificateStatus;
  certificateUrl?: string | null;
  rejectionReason?: string | null;
  appliedAt: string;
  reviewedAt?: string | null;
}

export const getMyCertificates = (): Promise<UserCertificate[]> =>
  api.get('/member/certificates').then((r) => r.data);

export const applyCertificate = (type: CertificateType): Promise<UserCertificate> =>
  api.post('/member/certificates', { type }).then((r) => r.data);
