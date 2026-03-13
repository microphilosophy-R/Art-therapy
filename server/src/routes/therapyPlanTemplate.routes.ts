import { Router } from 'express';
import {
  listTemplates,
  createTemplate,
  deleteTemplate,
} from '../controllers/therapyPlanTemplate.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { requireCertificate } from '../middleware/requireCertificate';
import { validate } from '../middleware/validate';
import {
  createTemplateSchema,
  listTemplatesSchema,
} from '../schemas/therapyPlanTemplate.schemas';

export const therapyPlanTemplateRouter = Router();
const providerCertificates = ['THERAPIST', 'COUNSELOR'] as const;

therapyPlanTemplateRouter.get(
  '/',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate(providerCertificates),
  validate(listTemplatesSchema, 'query'),
  listTemplates,
);

therapyPlanTemplateRouter.post(
  '/',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate(providerCertificates),
  validate(createTemplateSchema),
  createTemplate,
);

therapyPlanTemplateRouter.delete(
  '/:id',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate(providerCertificates),
  deleteTemplate,
);
