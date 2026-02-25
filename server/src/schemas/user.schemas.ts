import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  nickname: z.string().max(50).optional().nullable(),
  age: z.number().int().min(13).max(120).optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
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
