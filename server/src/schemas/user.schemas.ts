import { z } from 'zod';

const chinaMobileRegex = /^1\d{10}$/;
const chinaPostalCodeRegex = /^\d{6}$/;
const addressTagEnum = z.enum(['HOME', 'COMPANY', 'SCHOOL', 'PARENTS', 'OTHER']);

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

export const memberAddressPayloadSchema = z.object({
  recipientName: z.string().min(1).max(50),
  mobile: z.string().regex(chinaMobileRegex, 'Invalid China mobile number'),
  province: z.string().min(1).max(50),
  city: z.string().min(1).max(50),
  district: z.string().min(1).max(50),
  addressDetail: z.string().min(5).max(200),
  postalCode: z
    .string()
    .regex(chinaPostalCodeRegex, 'Invalid postal code')
    .optional()
    .nullable(),
  tag: addressTagEnum.default('HOME'),
  isDefault: z.boolean().optional(),
});

export const createMemberAddressSchema = memberAddressPayloadSchema;
export const updateMemberAddressSchema = memberAddressPayloadSchema.partial();
export const setDefaultMemberAddressSchema = z.object({
  // Supports an empty body while still using validation middleware.
  noop: z.boolean().optional(),
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
export type CreateMemberAddressInput = z.infer<typeof createMemberAddressSchema>;
export type UpdateMemberAddressInput = z.infer<typeof updateMemberAddressSchema>;
