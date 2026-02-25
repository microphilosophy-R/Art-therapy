import api from './axios';
import type { CreatePaymentIntentResponse, ConnectStatusResponse, AdminPaymentStats } from '../types/payment.types';
import type { Payment } from '../types';

export const createPaymentIntent = async (
  appointmentId: string
): Promise<CreatePaymentIntentResponse> => {
  const { data } = await api.post('/payments/create-intent', { appointmentId });
  return data;
};

export const getConnectStatus = async (): Promise<ConnectStatusResponse> => {
  const { data } = await api.get('/payments/connect/status');
  return data;
};

export const startConnectOnboarding = async (): Promise<{ url: string }> => {
  const { data } = await api.post('/payments/connect/onboard');
  return data;
};

export const getPaymentByAppointment = async (appointmentId: string): Promise<Payment> => {
  const { data } = await api.get(`/payments/appointment/${appointmentId}`);
  return data;
};

export const getAdminPaymentStats = async (
  from?: string,
  to?: string
): Promise<AdminPaymentStats> => {
  const { data } = await api.get('/payments/admin/stats', { params: { from, to } });
  return data;
};
