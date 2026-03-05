import { z } from 'zod';

const LangCodeSchema = z.enum(['zh', 'en']);

export const translateBatchSchema = z.object({
  items: z
    .array(
      z
        .object({
          key: z.string().min(1).max(120),
          text: z.string().min(1),
          sourceLang: LangCodeSchema,
          targetLang: LangCodeSchema,
        })
        .refine((item) => item.sourceLang !== item.targetLang, {
          message: 'sourceLang and targetLang must be different',
          path: ['targetLang'],
        }),
    )
    .min(1)
    .max(20),
});

export type TranslateBatchInput = z.infer<typeof translateBatchSchema>;
