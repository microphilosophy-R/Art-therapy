import api from './axios';
import type { User } from '../types';

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  nickname?: string | null;
  birthday?: string | null;
  age?: number | null;
  gender?: string | null;
  country?: string | null;
  religion?: string | null;
  phone?: string | null;
  bio?: string | null;
  specialties?: string[];
  sessionPrice?: number | null;
  sessionLength?: number | null;
  locationCity?: string | null;
  isAccepting?: boolean;
  consultEnabled?: boolean;
  hourlyConsultFee?: number | null;
  featuredImageUrl?: string | null;
  socialLinks?: { website?: string; instagram?: string; facebook?: string };
  qrCodeUrl?: string | null;
}

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ProfileUser extends User {
  nickname?: string;
  age?: number;
  gender?: string;
  birthday?: string;
  country?: string;
  religion?: string;
  privacyConsentAt?: string;
  userProfile?: {
    id: string;
    bio?: string | null;
    specialties?: string[];
    sessionPrice?: number | null;
    sessionLength?: number | null;
    locationCity?: string | null;
    isAccepting?: boolean;
    consultEnabled?: boolean;
    hourlyConsultFee?: number | null;
    featuredImageUrl?: string | null;
    socialLinks?: Record<string, string>;
    qrCodeUrl?: string | null;
    profileStatus?: string;
    rejectionReason?: string | null;
    certificates?: Array<{ type: string; status: string }>;
    galleryImages?: GalleryImage[];
  };
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

export const uploadPortrait = async (file: File): Promise<{ featuredImageUrl: string }> => {
  const formData = new FormData();
  formData.append('portrait', file);
  const { data } = await api.post('/profile/portrait', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export interface GalleryImage {
  id: string;
  url: string;
  order: number;
  createdAt: string;
}

export type AddressTag = 'HOME' | 'COMPANY' | 'SCHOOL' | 'PARENTS' | 'OTHER';

export interface MemberAddress {
  id: string;
  recipientName: string;
  mobile: string;
  province: string;
  city: string;
  district: string;
  addressDetail: string;
  postalCode?: string | null;
  tag: AddressTag;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MemberAddressPayload {
  recipientName: string;
  mobile: string;
  province: string;
  city: string;
  district: string;
  addressDetail: string;
  postalCode?: string | null;
  tag: AddressTag;
  isDefault?: boolean;
}

export const addGalleryImage = async (file: File): Promise<GalleryImage> => {
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await api.post('/profile/gallery', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteGalleryImage = async (imageId: string): Promise<void> => {
  await api.delete(`/profile/gallery/${imageId}`);
};

export const reorderGalleryImages = async (order: string[]): Promise<void> => {
  await api.patch('/profile/gallery/reorder', { order });
};

export const getMemberAddresses = async (): Promise<MemberAddress[]> => {
  const { data } = await api.get('/profile/addresses');
  return data;
};

export const createMemberAddress = async (payload: MemberAddressPayload): Promise<MemberAddress> => {
  const { data } = await api.post('/profile/addresses', payload);
  return data;
};

export const updateMemberAddress = async (
  id: string,
  payload: Partial<MemberAddressPayload> & { isDefault?: boolean }
): Promise<MemberAddress> => {
  const { data } = await api.put(`/profile/addresses/${id}`, payload);
  return data;
};

export const deleteMemberAddress = async (id: string): Promise<void> => {
  await api.delete(`/profile/addresses/${id}`);
};

export const setDefaultMemberAddress = async (id: string): Promise<MemberAddress> => {
  const { data } = await api.post(`/profile/addresses/${id}/default`, {});
  return data;
};
