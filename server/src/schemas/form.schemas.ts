import { z } from 'zod';

export const createFormSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  recipientId: z.string().cuid(),
  questions: z.array(z.object({
    order: z.number().int().min(0),
    type: z.enum(['SHORT_TEXT', 'LONG_TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SCALE', 'YES_NO']),
    label: z.string().min(1).max(500),
    required: z.boolean().default(false),
    options: z.array(z.string()).default([]),
    scaleMin: z.number().int().optional(),
    scaleMax: z.number().int().optional(),
  })).min(1),
});

export const submitFormSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().cuid(),
    value: z.string(),
  })),
});

export type CreateFormInput = z.infer<typeof createFormSchema>;
export type SubmitFormInput = z.infer<typeof submitFormSchema>;
