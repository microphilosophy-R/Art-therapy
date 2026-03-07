import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import {
  createPlan,
  listPlans,
  getPlan,
  updatePlan,
  checkScheduleConflicts,
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
import { requireCertificate } from '../middleware/requireCertificate';
import { validate } from '../middleware/validate';
import { optionalAuthenticate } from '../middleware/optionalAuthenticate';
import {
  createTherapyPlanSchema,
  updateTherapyPlanSchema,
  reviewTherapyPlanSchema,
  listTherapyPlansSchema,
  checkTherapyPlanConflictsSchema,
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

// 鈹€鈹€鈹€ Public / optional-auth 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
therapyPlanRouter.get(
  '/',
  optionalAuthenticate,
  validate(listTherapyPlansSchema, 'query'),
  listPlans,
);
// NOTE: /:id/ics must be registered before /:id so Express matches it correctly
therapyPlanRouter.get('/:id/ics', optionalAuthenticate, exportPlanIcs);
therapyPlanRouter.get('/:id', optionalAuthenticate, getPlan);

// 鈹€鈹€鈹€ Therapist / MEMBER with THERAPIST cert 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
therapyPlanRouter.post(
  '/',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate('THERAPIST'),
  validate(createTherapyPlanSchema),
  createPlan,
);
therapyPlanRouter.post(
  '/check-conflicts',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate('THERAPIST'),
  validate(checkTherapyPlanConflictsSchema),
  checkScheduleConflicts,
);
therapyPlanRouter.delete('/:id', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), deletePlan);
therapyPlanRouter.post('/:id/submit', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), submitForReview);

// 鈹€鈹€鈹€ Therapist or Admin 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
therapyPlanRouter.patch(
  '/:id',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate('THERAPIST'),
  validate(updateTherapyPlanSchema),
  updatePlan,
);
therapyPlanRouter.post(
  '/:id/archive',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate('THERAPIST'),
  archivePlan,
);
therapyPlanRouter.post(
  '/:id/poster',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate('THERAPIST'),
  imageUpload.single('poster'),
  multerErrorHandler,
  uploadPlanPoster,
);

therapyPlanRouter.post(
  '/:id/video',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate('THERAPIST'),
  videoUpload.single('video'),
  multerErrorHandler,
  uploadPlanVideo,
);

// 鈹€鈹€鈹€ Gallery images (Therapist or Admin) 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
therapyPlanRouter.post(
  '/:id/images',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate('THERAPIST'),
  imageUpload.single('image'),
  multerErrorHandler,
  addPlanImage,
);
therapyPlanRouter.delete('/:id/images/:imageId', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), deletePlanImage);
therapyPlanRouter.patch('/:id/images/order', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), reorderPlanImages);

// 鈹€鈹€鈹€ PDF attachment (Therapist or Admin) 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
therapyPlanRouter.post(
  '/:id/pdfs',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate('THERAPIST'),
  pdfUpload.single('pdf'),
  multerErrorHandler,
  addPlanPdf,
);
therapyPlanRouter.delete('/:id/pdfs/:pdfId', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), deletePlanPdf);
therapyPlanRouter.patch('/:id/pdfs/order', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), reorderPlanPdfs);

// 鈹€鈹€鈹€ Therapist or Admin (events) 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
therapyPlanRouter.put(
  '/:id/events',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate('THERAPIST'),
  validate(upsertPlanEventsSchema),
  upsertPlanEvents,
);

// 鈹€鈹€鈹€ Save as template 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
therapyPlanRouter.post(
  '/:id/save-as-template',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate('THERAPIST'),
  validate(saveAsTemplateSchema),
  saveAsTemplate,
);

// 鈹€鈹€鈹€ Admin 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
therapyPlanRouter.post(
  '/:id/review',
  authenticate,
  authorize('ADMIN'),
  validate(reviewTherapyPlanSchema),
  reviewPlan,
);

// 鈹€鈹€鈹€ Lifecycle (Therapist owner) 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
therapyPlanRouter.post('/:id/close-signup', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), closeSignup);
therapyPlanRouter.post('/:id/start', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), startPlan);
therapyPlanRouter.post('/:id/finish', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), finishPlan);
therapyPlanRouter.post('/:id/to-gallery', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate('THERAPIST'), movePlanToGallery);

// 鈹€鈹€鈹€ Cancel plan (Therapist owner or Admin) 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
therapyPlanRouter.post(
  '/:id/cancel-plan',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate('THERAPIST'),
  cancelPlan,
);

// 鈹€鈹€鈹€ Sign-up (Client or MEMBER) 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
therapyPlanRouter.get('/:id/signup/status', authenticate, authorize('MEMBER'), getSignupStatus);
therapyPlanRouter.post(
  '/:id/signup',
  authenticate,
  authorize('MEMBER'),
  validate(planSignupSchema),
  signUpForPlan,
);
therapyPlanRouter.delete('/:id/signup', authenticate, authorize('MEMBER'), cancelSignup);


