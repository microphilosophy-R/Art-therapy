import { Router } from 'express';
import { listUsers, updateUser, getAdminStats } from '../controllers/user.controller';
import { listPendingCertificates, reviewCertificate } from '../controllers/member.controller';
import { ProductController } from '../controllers/shop/product.controller';
import { getPendingProfiles, reviewProfile } from '../controllers/profile.controller';
import { getPendingPlans, reviewPlan } from '../controllers/therapyPlan.controller';
import { getReviewTimeline, getScheduleTimeline } from '../controllers/adminTimeline.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

export const adminRouter = Router();

adminRouter.use(authenticate, authorize('ADMIN'));

adminRouter.get('/users', listUsers);
adminRouter.patch('/users/:id', updateUser);
adminRouter.get('/stats', getAdminStats);
adminRouter.get('/certificates', listPendingCertificates);
adminRouter.patch('/certificates/:id', reviewCertificate);
adminRouter.get('/products/pending', ProductController.getPendingProducts);
adminRouter.post('/products/:id/review', ProductController.reviewProduct);
adminRouter.get('/profiles/pending', getPendingProfiles);
adminRouter.post('/profiles/:id/review', reviewProfile);
adminRouter.get('/therapy-plans/pending', getPendingPlans);
adminRouter.post('/therapy-plans/:id/review', reviewPlan);
adminRouter.get('/review-timeline', getReviewTimeline);
adminRouter.get('/schedule-timeline', getScheduleTimeline);
