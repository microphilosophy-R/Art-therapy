import { z } from 'zod';

export const createPaymentIntentSchema = z.object({
  appointmentId: z.string().cuid(),
});

export const adminStatsSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const refundPolicySchema = z.object({
  fullRefundHoursThreshold: z.number().int().min(0).default(24),
  allowPartialRefund: z.boolean().default(false),
  partialRefundPercent: z.number().int().min(0).max(100).optional(),
  policyDescription: z.string().min(10).max(500),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
