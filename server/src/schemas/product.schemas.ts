import { ProductCategory } from '@prisma/client';
import { z } from 'zod';

const localizedTextRequired = z.object({
  zh: z.string().min(1),
  en: z.string().min(1),
});

const productBaseSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100).optional(),
  titleI18n: localizedTextRequired.optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').optional(),
  descriptionI18n: localizedTextRequired.optional(),
  defaultPosterId: z.number().int().min(1).max(6).optional().nullable(),
  posterUrl: z.string().url().optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  price: z.number().positive('Price must be positive'),
  stock: z.number().int().nonnegative('Stock cannot be negative'),
  category: z.nativeEnum(ProductCategory),
  images: z.array(z.string().url()).max(9, 'Maximum 9 images allowed').optional(),
});

export const createProductSchema = productBaseSchema
  .refine((d) => !!(d.titleI18n || d.title), {
    path: ['titleI18n'],
    message: 'title or titleI18n is required',
  })
  .refine((d) => !!(d.descriptionI18n || d.description), {
    path: ['descriptionI18n'],
    message: 'description or descriptionI18n is required',
  })
  .refine((d) => {
    const hasDefaultPoster = d.defaultPosterId != null;
    const hasCustomPoster = !!d.posterUrl;
    return hasDefaultPoster !== hasCustomPoster;
  }, {
    path: ['defaultPosterId'],
    message: 'Provide either defaultPosterId or posterUrl, not both',
  });

export const updateProductSchema = productBaseSchema.partial().refine((d) => {
  const hasDefaultPoster = d.defaultPosterId != null;
  const hasCustomPoster = !!d.posterUrl;
  return !(hasDefaultPoster && hasCustomPoster);
}, {
  path: ['defaultPosterId'],
  message: 'Provide either defaultPosterId or posterUrl, not both',
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
