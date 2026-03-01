import { z } from 'zod';

export const updateProfileSchema = z.object({
  bio: z.string().min(10).max(2000).optional(),
  specialties: z.array(z.string()).min(1).optional(),
  sessionPrice: z.number().positive().optional(),
  sessionLength: z.number().int().positive().optional(),
  locationCity: z.string().min(1).optional(),
  isAccepting: z.boolean().optional(),
  featuredImageUrl: z.string().url().optional().or(z.literal('')),
  socialMediaLink: z.string().url().optional().or(z.literal('')),
  qrCodeUrl: z.string().url().optional().or(z.literal('')),
  consultEnabled: z.boolean().optional(),
  certificateUrl: z.string().url().optional().or(z.literal('')),
  hourlyConsultFee: z.number().positive().optional().nullable(),
});

export const reviewProfileSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().min(1).optional(),
}).refine(
  (d) => d.action !== 'REJECT' || !!d.rejectionReason,
  { message: 'rejectionReason is required when rejecting', path: ['rejectionReason'] },
);

export const availabilitySchema = z.array(
  z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
  })
);

export const therapistFiltersSchema = z.object({
  search: z.string().optional(),
  specialty: z.string().optional(),
  city: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  medium: z.enum(['IN_PERSON', 'VIDEO']).optional(),
  sortBy: z.enum(['rating', 'price_asc', 'price_desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ReviewProfileInput = z.infer<typeof reviewProfileSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
