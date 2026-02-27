import api from './axios';
import type { User } from '../types';

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  nickname?: string | null;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
}

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ProfileUser extends User {
  nickname?: string;
  age?: number;
  gender?: string;
  privacyConsentAt?: string;
}

export const getProfile = async (): Promise<ProfileUser> => {
  const { data } = await api.get('/profile');
  return data;
};

export const updateProfile = async (payload: UpdateProfilePayload): Promise<ProfileUser> => {
  const { data } = await api.patch('/profile', payload);
  return data;
};

export const updatePassword = async (payload: UpdatePasswordPayload): Promise<{ message: string }> => {
  const { data } = await api.patch('/profile/password', payload);
  return data;
};

export const acceptPrivacy = async (): Promise<{ id: string; privacyConsentAt: string }> => {
  const { data } = await api.post('/profile/privacy-consent', { accepted: true });
  return data;
};

export const uploadAvatar = async (file: File): Promise<{ avatarUrl: string }> => {
  const formData = new FormData();
  formData.append('avatar', file);
  const { data } = await api.post('/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
