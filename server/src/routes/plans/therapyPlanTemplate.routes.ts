import { Router } from 'express';
import { therapyPlanTemplateController } from '../../controllers';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { requireCertificate } from '../../middleware/requireCertificate';
import { validate } from '../../middleware/validate';
import {
  createTemplateSchema,
  listTemplatesSchema,
} from '../../schemas/therapyPlanTemplate.schemas';

export const therapyPlanTemplateRouter = Router();
const providerCertificates = ['THERAPIST', 'COUNSELOR'] as const;

therapyPlanTemplateRouter.get(
  '/',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate(providerCertificates),
  validate(listTemplatesSchema, 'query'),
  therapyPlanTemplateController.listTemplates,
);

therapyPlanTemplateRouter.post(
  '/',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate(providerCertificates),
  validate(createTemplateSchema),
  therapyPlanTemplateController.createTemplate,
);

therapyPlanTemplateRouter.delete(
  '/:id',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate(providerCertificates),
  therapyPlanTemplateController.deleteTemplate,
);

