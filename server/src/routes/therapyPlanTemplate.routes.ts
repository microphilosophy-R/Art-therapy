import { Router } from 'express';
import {
  listTemplates,
  createTemplate,
  deleteTemplate,
} from '../controllers/therapyPlanTemplate.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  createTemplateSchema,
  listTemplatesSchema,
} from '../schemas/therapyPlanTemplate.schemas';

export const therapyPlanTemplateRouter = Router();

therapyPlanTemplateRouter.get(
  '/',
  authenticate,
  authorize('THERAPIST', 'ADMIN'),
  validate(listTemplatesSchema, 'query'),
  listTemplates,
);

therapyPlanTemplateRouter.post(
  '/',
  authenticate,
  authorize('THERAPIST', 'ADMIN'),
  validate(createTemplateSchema),
  createTemplate,
);

therapyPlanTemplateRouter.delete(
  '/:id',
  authenticate,
  authorize('THERAPIST', 'ADMIN'),
  deleteTemplate,
);
