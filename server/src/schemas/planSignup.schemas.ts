import { z } from 'zod';

export const planSignupSchema = z.object({
  paymentProvider: z.enum(['ALIPAY', 'WECHAT_PAY', 'STRIPE']).default('ALIPAY'),
});

export type PlanSignupInput = z.infer<typeof planSignupSchema>;
