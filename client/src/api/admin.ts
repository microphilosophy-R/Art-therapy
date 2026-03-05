import api from './axios';
import type { User, PaginatedResponse, UserRole } from '../types';

export interface AdminPlatformStats {
  userCount: number;
  therapistCount: number;
  appointmentCount: number;
}

export const listAdminUsers = async (
  page = 1,
  limit = 20
): Promise<PaginatedResponse<User>> => {
  const { data } = await api.get('/admin/users', { params: { page, limit } });
  return data;
};

export const updateUserRole = async (id: string, role: UserRole): Promise<User> => {
  const { data } = await api.patch(`/admin/users/${id}`, { role });
  return data;
};

export const getAdminPlatformStats = async (): Promise<AdminPlatformStats> => {
  const { data } = await api.get('/admin/stats');
  return data;
};

export interface AdminCertificate {
  id: string;
  type: string;
  status: string;
  appliedAt: string;
  reviewedAt?: string | null;
  certificateUrls?: string[];
  rejectionReason?: string | null;
  profile: { user: { id: string; firstName: string; lastName: string; email: string } };
}

export interface AdminCertificateFilters {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'ALL';
  type?: 'COUNSELOR' | 'THERAPIST' | 'ARTIFICER' | 'ALL';
  q?: string;
}

export const listAdminCertificates = async (
  filters: AdminCertificateFilters = {}
): Promise<AdminCertificate[]> => {
  const params: Record<string, string> = {};
  if (filters.status && filters.status !== 'ALL') params.status = filters.status;
  if (filters.type && filters.type !== 'ALL') params.type = filters.type;
  if (filters.q?.trim()) params.q = filters.q.trim();

  const { data } = await api.get('/admin/certificates', { params });
  return data;
};

export const listPendingCertificates = async (): Promise<AdminCertificate[]> => {
  return listAdminCertificates({ status: 'PENDING' });
};

export const manageCertificate = async (
  id: string,
  payload: {
    action: 'APPROVE' | 'REJECT' | 'REVOKE' | 'RESET_TO_PENDING';
    rejectionReason?: string;
  }
): Promise<AdminCertificate> => {
  const { data } = await api.patch(`/admin/certificates/${id}`, payload);
  return data;
};

export const reviewCertificate = async (
  id: string,
  payload: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string }
): Promise<AdminCertificate> => {
  return manageCertificate(id, payload);
};
