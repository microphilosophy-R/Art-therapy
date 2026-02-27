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
} from '../controllers/therapyPlan.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { optionalAuthenticate } from '../middleware/optionalAuthenticate';
import {
  createTherapyPlanSchema,
  updateTherapyPlanSchema,
  reviewTherapyPlanSchema,
  listTherapyPlansSchema,
} from '../schemas/therapyPlan.schemas';

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

// ─── Admin ────────────────────────────────────────────────────────────────────
therapyPlanRouter.post(
  '/:id/review',
  authenticate,
  authorize('ADMIN'),
  validate(reviewTherapyPlanSchema),
  reviewPlan,
);
