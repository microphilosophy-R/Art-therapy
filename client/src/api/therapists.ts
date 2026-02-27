import api from './axios';
import type { TherapistProfile, TherapistFilters, PaginatedResponse, TimeSlot } from '../types';

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
