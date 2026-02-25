import { Router } from 'express';
import {
  createPaymentIntent, getConnectStatus, startConnectOnboarding,
  connectReturn, connectRefresh, getPaymentByAppointment, getAdminStats,
} from '../controllers/payment.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createPaymentIntentSchema } from '../schemas/payment.schemas';

export const paymentRouter = Router();

paymentRouter.post('/create-intent', authenticate, authorize('CLIENT'), validate(createPaymentIntentSchema), createPaymentIntent);
paymentRouter.get('/connect/status', authenticate, authorize('THERAPIST'), getConnectStatus);
paymentRouter.post('/connect/onboard', authenticate, authorize('THERAPIST'), startConnectOnboarding);
paymentRouter.get('/connect/return', connectReturn);
paymentRouter.get('/connect/refresh', connectRefresh);
paymentRouter.get('/appointment/:id', authenticate, getPaymentByAppointment);
paymentRouter.get('/admin/stats', authenticate, authorize('ADMIN'), getAdminStats);
