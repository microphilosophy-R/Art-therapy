import api from './axios';
import type { TherapistProfile, TherapistFilters, PaginatedResponse, TimeSlot, TherapistGalleryImage } from '../types';

export const getTherapists = async (filters?: TherapistFilters): Promise<PaginatedResponse<TherapistProfile>> => {
  const { data } = await api.get('/therapists', { params: filters });
  return data;
};

export const getTherapist = async (id: string): Promise<TherapistProfile> => {
  const { data } = await api.get(`/therapists/${id}`);
  return data;
};

export const getAvailableSlots = async (
  therapistId: string,
  date: string,
  duration?: number,
): Promise<TimeSlot[]> => {
  const { data } = await api.get(`/therapists/${therapistId}/slots`, {
    params: { date, ...(duration ? { duration } : {}) },
  });
  return data;
};

export const updateTherapistProfile = async (id: string, payload: Partial<TherapistProfile>): Promise<TherapistProfile> => {
  const { data } = await api.put(`/therapists/${id}`, payload);
  return data;
};

export const submitProfile = async (id: string): Promise<TherapistProfile> => {
  const { data } = await api.post(`/therapists/${id}/submit-profile`);
  return data;
};

export const reviewProfile = async (
  id: string,
  payload: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string },
): Promise<TherapistProfile> => {
  const { data } = await api.post(`/therapists/${id}/review-profile`, payload);
  return data;
};

export const getPendingProfiles = async (): Promise<TherapistProfile[]> => {
  const { data } = await api.get('/therapists/pending-profiles');
  return data;
};

export const addGalleryImage = async (therapistId: string, file: File): Promise<{ image: TherapistGalleryImage }> => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post(`/therapists/${therapistId}/gallery`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteGalleryImage = async (therapistId: string, imageId: string): Promise<void> => {
  await api.delete(`/therapists/${therapistId}/gallery/${imageId}`);
};

export const reorderGalleryImages = async (therapistId: string, order: string[]): Promise<void> => {
  await api.patch(`/therapists/${therapistId}/gallery/reorder`, { order });
};
