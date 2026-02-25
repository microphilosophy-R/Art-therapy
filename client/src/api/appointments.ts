import api from './axios';
import type { Appointment, PaginatedResponse, AppointmentFilters } from '../types';

export interface CreateAppointmentPayload {
  therapistId: string;
  startTime: string;
  endTime: string;
  medium: 'IN_PERSON' | 'VIDEO';
  clientNotes?: string;
}

export const createAppointment = async (payload: CreateAppointmentPayload): Promise<Appointment> => {
  const { data } = await api.post('/appointments', payload);
  return data;
};

export const getAppointments = async (filters?: AppointmentFilters): Promise<PaginatedResponse<Appointment>> => {
  const { data } = await api.get('/appointments', { params: filters });
  return data;
};

export const getAppointment = async (id: string): Promise<Appointment> => {
  const { data } = await api.get(`/appointments/${id}`);
  return data;
};

export const cancelAppointment = async (id: string): Promise<Appointment> => {
  const { data } = await api.delete(`/appointments/${id}`);
  return data;
};

export const updateAppointmentStatus = async (
  id: string,
  status: 'CONFIRMED' | 'CANCELLED'
): Promise<Appointment> => {
  const { data } = await api.patch(`/appointments/${id}/status`, { status });
  return data;
};
