import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { therapyPlanController, therapyPlanTemplateController } from '../../controllers';
import { saveAsTemplateSchema } from '../../schemas/therapyPlanTemplate.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { requireCertificate } from '../../middleware/requireCertificate';
import { validate } from '../../middleware/validate';
import { optionalAuthenticate } from '../../middleware/optionalAuthenticate';
import {
  createTherapyPlanSchema,
  updateTherapyPlanSchema,
  reviewTherapyPlanSchema,
  listTherapyPlansSchema,
  checkTherapyPlanConflictsSchema,
  upsertPlanEventsSchema,
} from '../../schemas/therapyPlan.schemas';
import { planSignupSchema } from '../../schemas/planSignup.schemas';

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
const providerCertificates = ['THERAPIST', 'COUNSELOR'] as const;

// ─── Public / optional-auth ───────────────────────────────────────────────────
therapyPlanRouter.get(
  '/',
  optionalAuthenticate,
  validate(listTherapyPlansSchema, 'query'),
  therapyPlanController.listPlans,
);
// NOTE: /:id/ics must be registered before /:id so Express matches it correctly
therapyPlanRouter.get('/:id/ics', optionalAuthenticate, therapyPlanController.exportPlanIcs);
therapyPlanRouter.get('/:id', optionalAuthenticate, therapyPlanController.getPlan);

// ─── Therapist / MEMBER with THERAPIST cert ───────────────────────────────────
therapyPlanRouter.post(
  '/',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate(providerCertificates),
  validate(createTherapyPlanSchema),
  therapyPlanController.createPlan,
);
therapyPlanRouter.post(
  '/check-conflicts',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate(providerCertificates),
  validate(checkTherapyPlanConflictsSchema),
  therapyPlanController.checkScheduleConflicts,
);
therapyPlanRouter.delete('/:id', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate(providerCertificates), therapyPlanController.deletePlan);
therapyPlanRouter.post('/:id/submit', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate(providerCertificates), therapyPlanController.submitForReview);

// ─── Therapist or Admin ───────────────────────────────────────────────────────
therapyPlanRouter.patch(
  '/:id',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate(providerCertificates),
  validate(updateTherapyPlanSchema),
  therapyPlanController.updatePlan,
);
therapyPlanRouter.post(
  '/:id/archive',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate(providerCertificates),
  therapyPlanController.archivePlan,
);
therapyPlanRouter.post(
  '/:id/poster',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate(providerCertificates),
  imageUpload.single('poster'),
  multerErrorHandler,
  therapyPlanController.uploadPlanPoster,
);

therapyPlanRouter.post(
  '/:id/video',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate(providerCertificates),
  videoUpload.single('video'),
  multerErrorHandler,
  therapyPlanController.uploadPlanVideo,
);

// ─── Gallery images (Therapist or Admin) ──────────────────────────────────────
therapyPlanRouter.post(
  '/:id/images',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate(providerCertificates),
  imageUpload.single('image'),
  multerErrorHandler,
  therapyPlanController.addPlanImage,
);
therapyPlanRouter.delete('/:id/images/:imageId', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate(providerCertificates), therapyPlanController.deletePlanImage);
therapyPlanRouter.patch('/:id/images/order', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate(providerCertificates), therapyPlanController.reorderPlanImages);

// ─── PDF attachment (Therapist or Admin) ──────────────────────────────────────
therapyPlanRouter.post(
  '/:id/pdfs',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate(providerCertificates),
  pdfUpload.single('pdf'),
  multerErrorHandler,
  therapyPlanController.addPlanPdf,
);
therapyPlanRouter.delete('/:id/pdfs/:pdfId', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate(providerCertificates), therapyPlanController.deletePlanPdf);
therapyPlanRouter.patch('/:id/pdfs/order', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate(providerCertificates), therapyPlanController.reorderPlanPdfs);

// ─── Therapist or Admin (events) ─────────────────────────────────────────────
therapyPlanRouter.put(
  '/:id/events',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate(providerCertificates),
  validate(upsertPlanEventsSchema),
  therapyPlanController.upsertPlanEvents,
);

// ─── Save as template ────────────────────────────────────────────────────────
therapyPlanRouter.post(
  '/:id/save-as-template',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate(providerCertificates),
  validate(saveAsTemplateSchema),
  therapyPlanTemplateController.saveAsTemplate,
);

// ─── Admin ────────────────────────────────────────────────────────────────────
therapyPlanRouter.post(
  '/:id/review',
  authenticate,
  authorize('ADMIN'),
  validate(reviewTherapyPlanSchema),
  therapyPlanController.reviewPlan,
);

// ─── Lifecycle (Therapist owner) ──────────────────────────────────────────────
therapyPlanRouter.post('/:id/close-signup', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate(providerCertificates), therapyPlanController.closeSignup);
therapyPlanRouter.post('/:id/start', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate(providerCertificates), therapyPlanController.startPlan);
therapyPlanRouter.post('/:id/finish', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate(providerCertificates), therapyPlanController.finishPlan);
therapyPlanRouter.post('/:id/to-gallery', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate(providerCertificates), therapyPlanController.movePlanToGallery);

// ─── Cancel plan (Therapist owner or Admin) ───────────────────────────────────
therapyPlanRouter.post(
  '/:id/cancel-plan',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate(providerCertificates),
  therapyPlanController.cancelPlan,
);

// ─── Sign-up (Client or MEMBER) ───────────────────────────────────────────────
therapyPlanRouter.get('/:id/signup/status', authenticate, authorize('MEMBER'), therapyPlanController.getSignupStatus);
therapyPlanRouter.post(
  '/:id/signup',
  authenticate,
  authorize('MEMBER'),
  validate(planSignupSchema),
  therapyPlanController.signUpForPlan,
);
therapyPlanRouter.delete('/:id/signup', authenticate, authorize('MEMBER'), therapyPlanController.cancelSignup);




