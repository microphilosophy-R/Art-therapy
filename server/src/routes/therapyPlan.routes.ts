import { Router } from 'express';
import multer from 'multer';
import {
  createPlan,
  listPlans,
  getPlan,
  updatePlan,
  submitForReview,
  reviewPlan,
  archivePlan,
  deletePlan,
  uploadPlanPoster,
  upsertPlanEvents,
  exportPlanIcs,
  closeSignup,
  startPlan,
  finishPlan,
  movePlanToGallery,
  cancelPlan,
  signUpForPlan,
  cancelSignup,
} from '../controllers/therapyPlan.controller';
import { saveAsTemplate } from '../controllers/therapyPlanTemplate.controller';
import { saveAsTemplateSchema } from '../schemas/therapyPlanTemplate.schemas';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { optionalAuthenticate } from '../middleware/optionalAuthenticate';
import {
  createTherapyPlanSchema,
  updateTherapyPlanSchema,
  reviewTherapyPlanSchema,
  listTherapyPlansSchema,
  upsertPlanEventsSchema,
} from '../schemas/therapyPlan.schemas';
import { planSignupSchema } from '../schemas/planSignup.schemas';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

export const therapyPlanRouter = Router();

// ─── Public / optional-auth ───────────────────────────────────────────────────
therapyPlanRouter.get(
  '/',
  optionalAuthenticate,
  validate(listTherapyPlansSchema, 'query'),
  listPlans,
);
// NOTE: /:id/ics must be registered before /:id so Express matches it correctly
therapyPlanRouter.get('/:id/ics', optionalAuthenticate, exportPlanIcs);
therapyPlanRouter.get('/:id', optionalAuthenticate, getPlan);

// ─── Therapist ────────────────────────────────────────────────────────────────
therapyPlanRouter.post(
  '/',
  authenticate,
  authorize('THERAPIST'),
  validate(createTherapyPlanSchema),
  createPlan,
);
therapyPlanRouter.delete('/:id', authenticate, authorize('THERAPIST'), deletePlan);
therapyPlanRouter.post('/:id/submit', authenticate, authorize('THERAPIST'), submitForReview);

// ─── Therapist or Admin ───────────────────────────────────────────────────────
therapyPlanRouter.patch(
  '/:id',
  authenticate,
  authorize('THERAPIST', 'ADMIN'),
  validate(updateTherapyPlanSchema),
  updatePlan,
);
therapyPlanRouter.post(
  '/:id/archive',
  authenticate,
  authorize('THERAPIST', 'ADMIN'),
  archivePlan,
);
therapyPlanRouter.post(
  '/:id/poster',
  authenticate,
  authorize('THERAPIST', 'ADMIN'),
  upload.single('poster'),
  uploadPlanPoster,
);

// ─── Therapist or Admin (events) ─────────────────────────────────────────────
therapyPlanRouter.put(
  '/:id/events',
  authenticate,
  authorize('THERAPIST', 'ADMIN'),
  validate(upsertPlanEventsSchema),
  upsertPlanEvents,
);

// ─── Save as template ────────────────────────────────────────────────────────
therapyPlanRouter.post(
  '/:id/save-as-template',
  authenticate,
  authorize('THERAPIST', 'ADMIN'),
  validate(saveAsTemplateSchema),
  saveAsTemplate,
);

// ─── Admin ────────────────────────────────────────────────────────────────────
therapyPlanRouter.post(
  '/:id/review',
  authenticate,
  authorize('ADMIN'),
  validate(reviewTherapyPlanSchema),
  reviewPlan,
);

// ─── Lifecycle (Therapist owner) ──────────────────────────────────────────────
therapyPlanRouter.post('/:id/close-signup', authenticate, authorize('THERAPIST'), closeSignup);
therapyPlanRouter.post('/:id/start', authenticate, authorize('THERAPIST'), startPlan);
therapyPlanRouter.post('/:id/finish', authenticate, authorize('THERAPIST'), finishPlan);
therapyPlanRouter.post('/:id/to-gallery', authenticate, authorize('THERAPIST'), movePlanToGallery);

// ─── Cancel plan (Therapist owner or Admin) ───────────────────────────────────
therapyPlanRouter.post(
  '/:id/cancel-plan',
  authenticate,
  authorize('THERAPIST', 'ADMIN'),
  cancelPlan,
);

// ─── Sign-up (Client) ─────────────────────────────────────────────────────────
therapyPlanRouter.post(
  '/:id/signup',
  authenticate,
  authorize('CLIENT'),
  validate(planSignupSchema),
  signUpForPlan,
);
therapyPlanRouter.delete('/:id/signup', authenticate, authorize('CLIENT'), cancelSignup);
