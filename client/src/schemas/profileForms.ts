import { z } from 'zod';

export const updateProfileSchema = z.object({
  bio: z.string().max(5000).optional(),
  specialties: z.array(z.string()).optional(),
  sessionPrice: z.number().optional(),
  sessionLength: z.number().optional(),
  locationCity: z.string().optional(),
  isAccepting: z.boolean().optional(),
  featuredImageUrl: z.string().optional(),
  socialMediaLink: z.string().optional(),
  qrCodeUrl: z.string().optional(),
  consultEnabled: z.boolean().optional(),
  hourlyConsultFee: z.number().optional(),
  certificateUrl: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
