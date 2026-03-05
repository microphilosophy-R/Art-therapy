import api from './axios';
import type { Conversation, Message, PaginatedResponse } from '../types';

export const getMyMessages = async (
  page = 1,
  limit = 20,
  kind: 'all' | 'system' | 'chat' = 'all',
): Promise<PaginatedResponse<Message>> => {
  const { data } = await api.get('/messages', { params: { page, limit, kind } });
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

export const getConversations = async (page = 1, limit = 20): Promise<PaginatedResponse<Conversation>> => {
  const { data } = await api.get('/messages/conversations', { params: { page, limit } });
  return data;
};

export const getConversationMessages = async (
  conversationId: string,
  cursor?: string,
  limit = 30,
): Promise<{ data: Message[] }> => {
  const { data } = await api.get(`/messages/conversations/${conversationId}`, {
    params: { cursor, limit },
  });
  return data;
};

export const sendChatMessage = async (recipientId: string, body: string): Promise<Message> => {
  const { data } = await api.post('/messages/chat', { recipientId, body });
  return data;
};

export const sendManualMessage = async (
  recipientId: string,
  body: string,
): Promise<Message> => {
  const { data } = await api.post('/messages', { recipientId, body });
  return data;
};
