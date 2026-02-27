import { z } from 'zod';

export const sendManualMessageSchema = z.object({
  recipientId: z.string().cuid(),
  body:        z.string().min(1).max(2000),
});

export const listMessagesSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type SendManualMessageInput = z.infer<typeof sendManualMessageSchema>;
