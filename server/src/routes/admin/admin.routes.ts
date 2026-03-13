import { Router } from 'express';
import {
  memberController,
  ProductController,
  profileController,
  therapyPlanController,
  userController,
  adminTimelineController,
} from '../../controllers';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { asyncHandler } from '../../middleware/asyncHandler';

export const adminRouter = Router();

adminRouter.use(authenticate, authorize('ADMIN'));

adminRouter.get('/users', userController.listUsers);
adminRouter.patch('/users/:id', userController.updateUser);
adminRouter.get('/stats', userController.getAdminStats);
adminRouter.get('/certificates', memberController.listPendingCertificates);
adminRouter.patch('/certificates/:id', memberController.reviewCertificate);
adminRouter.get('/products/pending', asyncHandler(ProductController.getPendingProducts));
adminRouter.post('/products/:id/review', asyncHandler(ProductController.reviewProduct));
adminRouter.get('/profiles/pending', profileController.getPendingProfiles);
adminRouter.post('/profiles/:id/review', profileController.reviewProfile);
adminRouter.get('/therapy-plans/pending', therapyPlanController.getPendingPlans);
adminRouter.post('/therapy-plans/:id/review', therapyPlanController.reviewPlan);
adminRouter.get('/review-timeline', adminTimelineController.getReviewTimeline);
adminRouter.get('/schedule-timeline', adminTimelineController.getScheduleTimeline);

