import api from './axios';
import type {
  TherapyPlan,
  TherapyPlanFilters,
  PaginatedResponse,
  TherapyPlanType,
  ArtSalonSubType,
  SessionMedium,
} from '../types';

export interface CreateTherapyPlanPayload {
  type:            TherapyPlanType;
  title:           string;
  introduction:    string;
  startTime:       string;
  endTime?:        string;
  location:        string;
  maxParticipants?: number | null;
  contactInfo:     string;
  artSalonSubType?: ArtSalonSubType | null;
  sessionMedium?:  SessionMedium | null;
  defaultPosterId?: number | null;
  posterUrl?:      string | null;
}

export type UpdateTherapyPlanPayload = Partial<CreateTherapyPlanPayload>;

export interface ReviewTherapyPlanPayload {
  action:          'APPROVE' | 'REJECT';
  rejectionReason?: string;
}

export const listTherapyPlans = async (
  filters?: TherapyPlanFilters,
): Promise<PaginatedResponse<TherapyPlan>> => {
  const { data } = await api.get('/therapy-plans', { params: filters });
  return data;
};

export const getTherapyPlan = async (id: string): Promise<TherapyPlan> => {
  const { data } = await api.get(`/therapy-plans/${id}`);
  return data;
};

export const createTherapyPlan = async (
  payload: CreateTherapyPlanPayload,
): Promise<TherapyPlan> => {
  const { data } = await api.post('/therapy-plans', payload);
  return data;
};

export const updateTherapyPlan = async (
  id: string,
  payload: UpdateTherapyPlanPayload,
): Promise<TherapyPlan> => {
  const { data } = await api.patch(`/therapy-plans/${id}`, payload);
  return data;
};

export const deleteTherapyPlan = async (id: string): Promise<void> => {
  await api.delete(`/therapy-plans/${id}`);
};

export const submitTherapyPlanForReview = async (id: string): Promise<TherapyPlan> => {
  const { data } = await api.post(`/therapy-plans/${id}/submit`);
  return data;
};

export const reviewTherapyPlan = async (
  id: string,
  payload: ReviewTherapyPlanPayload,
): Promise<TherapyPlan> => {
  const { data } = await api.post(`/therapy-plans/${id}/review`, payload);
  return data;
};

export const archiveTherapyPlan = async (id: string): Promise<TherapyPlan> => {
  const { data } = await api.post(`/therapy-plans/${id}/archive`);
  return data;
};

export const uploadTherapyPlanPoster = async (
  id: string,
  file: File,
): Promise<{ posterUrl: string }> => {
  const formData = new FormData();
  formData.append('poster', file);
  const { data } = await api.post(`/therapy-plans/${id}/poster`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
