import api from './axios';
import type { TherapyPlanTemplate, TherapyPlanType } from '../types';

export const listTherapyPlanTemplates = (type?: TherapyPlanType) =>
  api
    .get<TherapyPlanTemplate[]>('/therapy-plan-templates', {
      params: type ? { type } : undefined,
    })
    .then((r) => r.data);

export const createTherapyPlanTemplate = (payload: {
  type: TherapyPlanType;
  name: string;
  isPublic: boolean;
  data: Record<string, unknown>;
}) => api.post<TherapyPlanTemplate>('/therapy-plan-templates', payload).then((r) => r.data);

export const deleteTherapyPlanTemplate = (id: string) =>
  api.delete(`/therapy-plan-templates/${id}`);

export const saveTherapyPlanAsTemplate = (
  planId: string,
  payload: { name: string; isPublic: boolean },
) =>
  api
    .post<TherapyPlanTemplate>(`/therapy-plans/${planId}/save-as-template`, payload)
    .then((r) => r.data);
