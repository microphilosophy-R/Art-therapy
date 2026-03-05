import api from './axios';
import type { PaginatedResponse, User } from '../types';

export const followUser = async (userId: string) => {
  const { data } = await api.post(`/follows/${userId}`);
  return data as { success: boolean };
};

export const unfollowUser = async (userId: string) => {
  await api.delete(`/follows/${userId}`);
};

export const getFollowStatus = async (userId: string) => {
  const { data } = await api.get(`/follows/status/${userId}`);
  return data as { isFollowing: boolean };
};

export const listMyFollows = async (
  tab: 'followers' | 'following',
  page = 1,
  limit = 20,
) => {
  const { data } = await api.get('/follows/me', { params: { tab, page, limit } });
  return data as PaginatedResponse<User & { followedAt: string }>;
};
