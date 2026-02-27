import { z } from 'zod';

const PLAN_TYPES = ['PERSONAL_CONSULT', 'GROUP_CONSULT', 'ART_SALON', 'WELLNESS_RETREAT'] as const;
const ART_SALON_SUBTYPES = [
  'CALLIGRAPHY',
  'PAINTING',
  'DRAMA',
  'YOGA',
  'BOARD_GAMES',
  'CULTURAL_CONVERSATION',
] as const;
const PLAN_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED'] as const;

export const createTherapyPlanSchema = z
  .object({
    type: z.enum([...PLAN_TYPES]),
    title: z.string().min(5).max(100),
    slogan: z.string().max(60).optional(),
    introduction: z.string().min(20).max(2000),
    startTime: z.string().datetime(),
    endTime: z.string().datetime().nullable().optional(),
    location: z.string().min(1).max(300),
    maxParticipants: z.number().int().min(1).max(100).optional().nullable(),
    contactInfo: z.string().min(1).max(300),
    artSalonSubType: z.enum(ART_SALON_SUBTYPES).optional().nullable(),
    sessionMedium: z.enum(['IN_PERSON', 'VIDEO']).optional().nullable(),
    defaultPosterId: z.number().int().min(1).max(6).optional().nullable(),
    posterUrl: z.string().url().optional().nullable(),
  })
  .refine((d) => !(d.defaultPosterId && d.posterUrl), {
    message: 'Provide either defaultPosterId or posterUrl, not both',
  })
  .refine((d) => d.type !== 'ART_SALON' || d.artSalonSubType != null, {
    message: 'artSalonSubType is required for ART_SALON plans',
    path: ['artSalonSubType'],
  })
  .refine((d) => d.type !== 'PERSONAL_CONSULT' || d.sessionMedium != null, {
    message: 'sessionMedium is required for PERSONAL_CONSULT plans',
    path: ['sessionMedium'],
  })
  .refine((d) => d.type !== 'GROUP_CONSULT' || d.maxParticipants == null || d.maxParticipants <= 12, {
    message: 'GROUP_CONSULT may have at most 12 participants',
    path: ['maxParticipants'],
  });

export const updateTherapyPlanSchema = z
  .object({
    type: z.enum([...PLAN_TYPES]).optional(),
    title: z.string().min(5).max(100).optional(),
    slogan: z.string().max(60).nullable().optional(),
    introduction: z.string().min(20).max(2000).optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().nullable().optional(),
    location: z.string().min(1).max(300).optional(),
    maxParticipants: z.number().int().min(1).max(100).optional().nullable(),
    contactInfo: z.string().min(1).max(300).optional(),
    artSalonSubType: z.enum(ART_SALON_SUBTYPES).optional().nullable(),
    sessionMedium: z.enum(['IN_PERSON', 'VIDEO']).optional().nullable(),
    defaultPosterId: z.number().int().min(1).max(6).optional().nullable(),
    posterUrl: z.string().url().optional().nullable(),
  });

export const reviewTherapyPlanSchema = z
  .object({
    action: z.enum(['APPROVE', 'REJECT']),
    rejectionReason: z.string().min(1).max(1000).optional(),
  })
  .refine((d) => d.action !== 'REJECT' || d.rejectionReason != null, {
    message: 'rejectionReason is required when rejecting a plan',
    path: ['rejectionReason'],
  });

export const listTherapyPlansSchema = z.object({
  type: z.enum([...PLAN_TYPES]).optional(),
  status: z.enum([...PLAN_STATUSES]).optional(),
  timeFilter: z.enum(['upcoming', 'past']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type CreateTherapyPlanInput = z.infer<typeof createTherapyPlanSchema>;
export type UpdateTherapyPlanInput = z.infer<typeof updateTherapyPlanSchema>;
export type ReviewTherapyPlanInput = z.infer<typeof reviewTherapyPlanSchema>;
export type ListTherapyPlansQuery = z.infer<typeof listTherapyPlansSchema>;
