import { z } from 'zod';

export const sendManualMessageSchema = z.object({
  recipientId: z.string().cuid(),
  body:        z.string().min(1).max(2000),
});

export const listMessagesSchema = z.object({
  kind: z.enum(['all', 'system', 'chat']).default('all'),
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const listConversationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const listConversationMessagesSchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const sendChatMessageSchema = z.object({
  recipientId: z.string().cuid(),
  body: z.string().min(1).max(2000),
});

export type SendManualMessageInput = z.infer<typeof sendManualMessageSchema>;
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
