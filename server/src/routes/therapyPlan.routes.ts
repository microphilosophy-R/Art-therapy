import { Router, Request, Response, NextFunction } from 'express';
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
  uploadPlanVideo,
  addPlanImage,
  deletePlanImage,
  reorderPlanImages,
  addPlanPdf,
  deletePlanPdf,
  reorderPlanPdfs,
  upsertPlanEvents,
  exportPlanIcs,
  closeSignup,
  startPlan,
  finishPlan,
  movePlanToGallery,
  cancelPlan,
  signUpForPlan,
  cancelSignup,
  getSignupStatus,
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

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only mp4, mov, and webm video files are allowed'));
  },
});

/** Surfaces multer size/type errors as structured JSON instead of crashing */
function multerErrorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File too large. Please check the size limit and try again.' });
    }
    return res.status(400).json({ message: err.message });
  }
  if (err instanceof Error && (err.message.includes('Only image') || err.message.includes('Only mp4') || err.message.includes('Only PDF'))) {
    return res.status(415).json({ message: err.message });
  }
  next(err);
}

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
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
  imageUpload.single('poster'),
  multerErrorHandler,
  uploadPlanPoster,
);

therapyPlanRouter.post(
  '/:id/video',
  authenticate,
  authorize('THERAPIST', 'ADMIN'),
  videoUpload.single('video'),
  multerErrorHandler,
  uploadPlanVideo,
);

// ─── Gallery images (Therapist or Admin) ──────────────────────────────────────
therapyPlanRouter.post(
  '/:id/images',
  authenticate,
  authorize('THERAPIST', 'ADMIN'),
  imageUpload.single('image'),
  multerErrorHandler,
  addPlanImage,
);
therapyPlanRouter.delete('/:id/images/:imageId', authenticate, authorize('THERAPIST', 'ADMIN'), deletePlanImage);
therapyPlanRouter.patch('/:id/images/order', authenticate, authorize('THERAPIST', 'ADMIN'), reorderPlanImages);

// ─── PDF attachment (Therapist or Admin) ──────────────────────────────────────
therapyPlanRouter.post(
  '/:id/pdfs',
  authenticate,
  authorize('THERAPIST', 'ADMIN'),
  pdfUpload.single('pdf'),
  multerErrorHandler,
  addPlanPdf,
);
therapyPlanRouter.delete('/:id/pdfs/:pdfId', authenticate, authorize('THERAPIST', 'ADMIN'), deletePlanPdf);
therapyPlanRouter.patch('/:id/pdfs/order', authenticate, authorize('THERAPIST', 'ADMIN'), reorderPlanPdfs);

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
therapyPlanRouter.get('/:id/signup/status', authenticate, authorize('CLIENT'), getSignupStatus);
therapyPlanRouter.post(
  '/:id/signup',
  authenticate,
  authorize('CLIENT'),
  validate(planSignupSchema),
  signUpForPlan,
);
therapyPlanRouter.delete('/:id/signup', authenticate, authorize('CLIENT'), cancelSignup);
