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
  type: TherapyPlanType;
  title: string;
  slogan?: string;
  introduction: string;
  startTime: string;
  endTime?: string;
  location: string;
  maxParticipants?: number | null;
  contactInfo: string;
  artSalonSubType?: ArtSalonSubType | null;
  sessionMedium?: SessionMedium | null;
  defaultPosterId?: number | null;
  posterUrl?: string | null;
  price?: number | null;
}

export type UpdateTherapyPlanPayload = Partial<CreateTherapyPlanPayload>;

export interface ReviewTherapyPlanPayload {
  action: 'APPROVE' | 'REJECT';
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
  onUploadProgress?: (percent: number) => void,
): Promise<{ posterUrl: string }> => {
  const formData = new FormData();
  formData.append('poster', file);
  const { data } = await api.post(`/therapy-plans/${id}/poster`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onUploadProgress
      ? (e) => onUploadProgress(Math.round((e.loaded * 100) / (e.total ?? 1)))
      : undefined,
  });
  return data;
};

export const uploadTherapyPlanVideo = async (
  id: string,
  file: File,
  onUploadProgress?: (percent: number) => void,
): Promise<{ videoUrl: string }> => {
  const formData = new FormData();
  formData.append('video', file);
  const { data } = await api.post(`/therapy-plans/${id}/video`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onUploadProgress
      ? (e) => onUploadProgress(Math.round((e.loaded * 100) / (e.total ?? 1)))
      : undefined,
  });
  return data;
};

export interface TherapyPlanEventPayload {
  startTime: string;
  endTime?: string | null;
  title?: string | null;
  isAvailable: boolean;
  order: number;
}

export const upsertTherapyPlanEvents = async (
  id: string,
  payload: { events: TherapyPlanEventPayload[] },
): Promise<TherapyPlan> => {
  const { data } = await api.put(`/therapy-plans/${id}/events`, payload);
  return data;
};

/** Returns the direct URL to the .ics file for a plan (use in <a href> or webcal). */
export const getTherapyPlanIcsUrl = (id: string): string => {
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';
  return `${base}/therapy-plans/${id}/ics`;
};

// ─── Gallery images ────────────────────────────────────────────────────────────

export const addTherapyPlanImage = async (
  id: string,
  file: File,
  onUploadProgress?: (percent: number) => void,
): Promise<{ image: { id: string; url: string; order: number } }> => {
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await api.post(`/therapy-plans/${id}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onUploadProgress
      ? (e) => onUploadProgress(Math.round((e.loaded * 100) / (e.total ?? 1)))
      : undefined,
  });
  return data;
};

export const deleteTherapyPlanImage = async (id: string, imageId: string): Promise<void> => {
  await api.delete(`/therapy-plans/${id}/images/${imageId}`);
};

export const reorderTherapyPlanImages = async (id: string, order: string[]): Promise<void> => {
  await api.patch(`/therapy-plans/${id}/images/order`, { order });
};

// ─── PDF attachment ────────────────────────────────────────────────────────────

export const uploadTherapyPlanAttachment = async (
  id: string,
  file: File,
): Promise<{ attachmentUrl: string; attachmentName: string }> => {
  const formData = new FormData();
  formData.append('attachment', file);
  const { data } = await api.post(`/therapy-plans/${id}/attachment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

// ─── Lifecycle ────────────────────────────────────────────────────────────────

export const closeTherapyPlanSignup = async (id: string): Promise<TherapyPlan> => {
  const { data } = await api.post(`/therapy-plans/${id}/close-signup`);
  return data;
};

export const startTherapyPlan = async (id: string): Promise<TherapyPlan> => {
  const { data } = await api.post(`/therapy-plans/${id}/start`);
  return data;
};

export const finishTherapyPlan = async (id: string): Promise<TherapyPlan> => {
  const { data } = await api.post(`/therapy-plans/${id}/finish`);
  return data;
};

export const moveTherapyPlanToGallery = async (id: string): Promise<TherapyPlan> => {
  const { data } = await api.post(`/therapy-plans/${id}/to-gallery`);
  return data;
};

export const cancelTherapyPlan = async (id: string): Promise<TherapyPlan> => {
  const { data } = await api.post(`/therapy-plans/${id}/cancel-plan`);
  return data;
};

// ─── Sign-up ──────────────────────────────────────────────────────────────────

export const signUpForTherapyPlan = async (
  id: string,
  payload: { paymentProvider: 'ALIPAY' | 'WECHAT_PAY' | 'STRIPE' },
): Promise<{ participant: { id: string; status: string }; payment?: unknown }> => {
  const { data } = await api.post(`/therapy-plans/${id}/signup`, payload);
  return data;
};

export const cancelTherapyPlanSignup = async (id: string): Promise<void> => {
  await api.delete(`/therapy-plans/${id}/signup`);
};
