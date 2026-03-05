import { z } from 'zod';

export const followTargetParamsSchema = z.object({
  userId: z.string().cuid(),
});

export const listMyFollowsSchema = z.object({
  tab: z.enum(['followers', 'following']).default('followers'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListMyFollowsQuery = z.infer<typeof listMyFollowsSchema>;
