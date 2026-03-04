import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  nickname: z.string().max(50).optional().nullable(),
  birthday: z.string().optional().nullable(),
  age: z.number().int().min(13).max(120).optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  religion: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  bio: z.string().max(5000).optional().nullable(),
  specialties: z.array(z.string().max(100)).optional(),
  sessionPrice: z.number().nonnegative().optional().nullable(),
  sessionLength: z.number().int().positive().optional().nullable(),
  locationCity: z.string().max(100).optional().nullable(),
  isAccepting: z.boolean().optional(),
  consultEnabled: z.boolean().optional(),
  hourlyConsultFee: z.number().nonnegative().optional().nullable(),
  featuredImageUrl: z.string().url().optional().nullable(),
  socialLinks: z.record(z.string(), z.string().url()).optional(),
  qrCodeUrl: z.string().url().optional().nullable(),
  showcaseConfig: z.any().optional(),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const acceptPrivacySchema = z.object({
  accepted: z.literal(true),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
