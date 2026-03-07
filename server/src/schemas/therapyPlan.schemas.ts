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
const PLAN_STATUSES = [
  'DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED',
  'SIGN_UP_CLOSED', 'IN_PROGRESS', 'FINISHED', 'IN_GALLERY', 'CANCELLED', 'ARCHIVED',
] as const;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const LocalizedTextRequired = z.object({
  zh: z.string().min(1),
  en: z.string().min(1),
});

export const LocalizedTextOptional = z.object({
  zh: z.string().optional(),
  en: z.string().optional(),
});

export const createTherapyPlanSchema = z
  .object({
    type: z.enum([...PLAN_TYPES]),
    title: z.string().min(5).max(100).optional(),
    titleI18n: LocalizedTextRequired.optional(),
    slogan: z.string().max(60).optional(),
    sloganI18n: LocalizedTextOptional.optional().nullable(),
    introduction: z.string().min(20).max(2000).optional(),
    introductionI18n: LocalizedTextRequired.optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().nullable().optional(),
    consultDateStart: z.string().regex(DATE_ONLY_RE).optional(),
    consultDateEnd: z.string().regex(DATE_ONLY_RE).optional(),
    consultWorkStartMin: z.number().int().min(0).max(1439).optional(),
    consultWorkEndMin: z.number().int().min(1).max(1440).optional(),
    consultTimezone: z.string().min(1).optional(),
    location: z.string().min(1).max(300),
    maxParticipants: z.number().int().min(1).max(100).optional().nullable(),
    contactInfo: z.string().min(1).max(300),
    artSalonSubType: z.enum(ART_SALON_SUBTYPES).optional().nullable(),
    sessionMedium: z.enum(['IN_PERSON', 'VIDEO']).optional().nullable(),
    defaultPosterId: z.number().int().min(1).max(10).optional().nullable(),
    posterUrl: z.string().url().optional().nullable(),
    price: z.number().min(0).optional().nullable(),
  })
  .refine((d) => !!(d.titleI18n || d.title), {
    message: 'title or titleI18n is required',
    path: ['titleI18n'],
  })
  .refine((d) => !!(d.introductionI18n || d.introduction), {
    message: 'introduction or introductionI18n is required',
    path: ['introductionI18n'],
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
  .refine((d) => d.type === 'PERSONAL_CONSULT' || !!d.startTime, {
    message: 'startTime is required for non-personal plans',
    path: ['startTime'],
  })
  .refine(
    (d) =>
      d.type !== 'PERSONAL_CONSULT' ||
      (!d.consultDateStart && !d.consultDateEnd) ||
      (!!d.consultDateStart && !!d.consultDateEnd),
    {
      message: 'consultDateStart and consultDateEnd must be provided together for PERSONAL_CONSULT plans',
      path: ['consultDateStart'],
    },
  )
  .refine(
    (d) =>
      d.type !== 'PERSONAL_CONSULT' ||
      (d.consultWorkStartMin == null && d.consultWorkEndMin == null) ||
      (d.consultWorkStartMin != null && d.consultWorkEndMin != null),
    {
      message: 'consultWorkStartMin and consultWorkEndMin must be provided together for PERSONAL_CONSULT plans',
      path: ['consultWorkStartMin'],
    },
  )
  .refine(
    (d) =>
      d.type !== 'PERSONAL_CONSULT' ||
      (
        !d.consultDateStart &&
        !d.consultDateEnd &&
        d.consultWorkStartMin == null &&
        d.consultWorkEndMin == null
      ) ||
      !!d.consultTimezone,
    {
      message: 'consultTimezone is required when consult schedule fields are provided',
      path: ['consultTimezone'],
    },
  )
  .refine(
    (d) => d.type !== 'PERSONAL_CONSULT' || !d.consultDateStart || !d.consultDateEnd || d.consultDateEnd >= d.consultDateStart,
    {
      message: 'consultDateEnd must be on or after consultDateStart',
      path: ['consultDateEnd'],
    },
  )
  .refine(
    (d) =>
      d.type !== 'PERSONAL_CONSULT' ||
      d.consultWorkStartMin == null ||
      d.consultWorkEndMin == null ||
      d.consultWorkEndMin > d.consultWorkStartMin,
    {
      message: 'consultWorkEndMin must be greater than consultWorkStartMin',
      path: ['consultWorkEndMin'],
    },
  )
  .refine(
    (d) => !d.startTime || !d.endTime || d.endTime > d.startTime,
    {
      message: 'endTime must be after startTime',
      path: ['endTime'],
    },
  )
  .refine((d) => d.type !== 'GROUP_CONSULT' || d.maxParticipants == null || d.maxParticipants <= 12, {
    message: 'GROUP_CONSULT may have at most 12 participants',
    path: ['maxParticipants'],
  });

export const updateTherapyPlanSchema = z
  .object({
    type: z.enum([...PLAN_TYPES]).optional(),
    title: z.string().min(5).max(100).optional(),
    titleI18n: LocalizedTextRequired.partial().optional(),
    slogan: z.string().max(60).nullable().optional(),
    sloganI18n: LocalizedTextOptional.optional().nullable(),
    introduction: z.string().min(20).max(2000).optional(),
    introductionI18n: LocalizedTextRequired.partial().optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().nullable().optional(),
    consultDateStart: z.string().regex(DATE_ONLY_RE).optional(),
    consultDateEnd: z.string().regex(DATE_ONLY_RE).optional(),
    consultWorkStartMin: z.number().int().min(0).max(1439).optional(),
    consultWorkEndMin: z.number().int().min(1).max(1440).optional(),
    consultTimezone: z.string().min(1).optional(),
    location: z.string().min(1).max(300).optional(),
    maxParticipants: z.number().int().min(1).max(100).optional().nullable(),
    contactInfo: z.string().min(1).max(300).optional(),
    artSalonSubType: z.enum(ART_SALON_SUBTYPES).optional().nullable(),
    sessionMedium: z.enum(['IN_PERSON', 'VIDEO']).optional().nullable(),
    defaultPosterId: z.number().int().min(1).max(10).optional().nullable(),
    posterUrl: z.string().url().optional().nullable(),
    price: z.number().min(0).optional().nullable(),
  })
  .refine(
    (d) => !d.startTime || !d.endTime || d.endTime > d.startTime,
    {
      message: 'endTime must be after startTime',
      path: ['endTime'],
    },
  )
  .refine(
    (d) =>
      d.consultWorkStartMin == null ||
      d.consultWorkEndMin == null ||
      d.consultWorkEndMin > d.consultWorkStartMin,
    {
      message: 'consultWorkEndMin must be greater than consultWorkStartMin',
      path: ['consultWorkEndMin'],
    },
  )
  .refine(
    (d) => !d.consultDateStart || !d.consultDateEnd || d.consultDateEnd >= d.consultDateStart,
    {
      message: 'consultDateEnd must be on or after consultDateStart',
      path: ['consultDateEnd'],
    },
  );

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
  therapistId: z.string().optional(),
  type: z.enum([...PLAN_TYPES]).optional(),
  status: z.enum([...PLAN_STATUSES]).optional(),
  timeFilter: z.enum(['upcoming', 'past']).optional(),
  role: z.enum(['creator', 'participant']).optional(),
  sortBy: z.enum(['startTime', 'createdAt', 'updatedAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const checkTherapyPlanConflictsSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable().optional(),
  excludePlanId: z.string().optional(),
});

export type CreateTherapyPlanInput = z.infer<typeof createTherapyPlanSchema>;
export type UpdateTherapyPlanInput = z.infer<typeof updateTherapyPlanSchema>;
export type ReviewTherapyPlanInput = z.infer<typeof reviewTherapyPlanSchema>;
export type ListTherapyPlansQuery = z.infer<typeof listTherapyPlansSchema>;
export type CheckTherapyPlanConflictsInput = z.infer<typeof checkTherapyPlanConflictsSchema>;

export const upsertPlanEventsSchema = z.object({
  events: z
    .array(
      z.object({
        startTime: z.string().datetime(),
        endTime: z.string().datetime().nullable().optional(),
        title: z.string().max(100).nullable().optional(),
        isAvailable: z.boolean().default(true),
        order: z.number().int().min(0).default(0),
      }),
    )
    .min(1)
    .max(50),
});

export type UpsertPlanEventsInput = z.infer<typeof upsertPlanEventsSchema>;
