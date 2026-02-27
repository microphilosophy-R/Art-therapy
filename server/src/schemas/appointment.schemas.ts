import { z } from 'zod';

export const createAppointmentSchema = z.object({
  therapistId: z.string().cuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  medium: z.enum(['IN_PERSON', 'VIDEO']).default('VIDEO'),
  clientNotes: z.string().max(1000).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'IN_PROGRESS', 'CANCELLED', 'COMPLETED']),
});

export const appointmentFiltersSchema = z.object({
  status: z.array(z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'CANCELLED', 'COMPLETED'])).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const sessionNoteSchema = z.object({
  content: z.string().min(1).max(10000),
  artworkUrl: z.string().url().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type SessionNoteInput = z.infer<typeof sessionNoteSchema>;
