import api from './axios';
import type { Message, PaginatedResponse } from '../types';

export const getMyMessages = async (page = 1, limit = 20): Promise<PaginatedResponse<Message>> => {
  const { data } = await api.get('/messages', { params: { page, limit } });
  return data;
};

export const getUnreadCount = async (): Promise<{ count: number }> => {
  const { data } = await api.get('/messages/unread-count');
  return data;
};

export const markMessageAsRead = async (id: string): Promise<Message> => {
  const { data } = await api.patch(`/messages/${id}/read`);
  return data;
};

export const markAllMessagesAsRead = async (): Promise<{ updated: number }> => {
  const { data } = await api.patch('/messages/read-all');
  return data;
};

export const sendManualMessage = async (
  recipientId: string,
  body: string,
): Promise<Message> => {
  const { data } = await api.post('/messages', { recipientId, body });
  return data;
};
