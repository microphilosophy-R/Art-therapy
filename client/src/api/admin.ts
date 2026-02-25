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
