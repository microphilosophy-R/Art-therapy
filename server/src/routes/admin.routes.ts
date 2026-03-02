import { Router } from 'express';
import { listUsers, updateUser, getAdminStats } from '../controllers/user.controller';
import { listPendingCertificates, reviewCertificate } from '../controllers/member.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

export const adminRouter = Router();

adminRouter.use(authenticate, authorize('ADMIN'));

adminRouter.get('/users', listUsers);
adminRouter.patch('/users/:id', updateUser);
adminRouter.get('/stats', getAdminStats);
adminRouter.get('/certificates', listPendingCertificates);
adminRouter.patch('/certificates/:id', reviewCertificate);
