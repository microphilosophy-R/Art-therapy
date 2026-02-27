import { z } from 'zod';

const PLAN_TYPES = ['PERSONAL_CONSULT', 'GROUP_CONSULT', 'ART_SALON', 'WELLNESS_RETREAT'] as const;

export const createTemplateSchema = z.object({
  type: z.enum([...PLAN_TYPES]),
  name: z.string().min(2).max(100),
  isPublic: z.boolean().default(false),
  data: z.record(z.unknown()),
});

export const listTemplatesSchema = z.object({
  type: z.enum([...PLAN_TYPES]).optional(),
});

export const saveAsTemplateSchema = z.object({
  name: z.string().min(2).max(100),
  isPublic: z.boolean().default(false),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type ListTemplatesQuery = z.infer<typeof listTemplatesSchema>;
export type SaveAsTemplateInput = z.infer<typeof saveAsTemplateSchema>;
