import { Router } from 'express';
import {
  createPaymentIntent, getConnectStatus, startConnectOnboarding,
  connectReturn, connectRefresh, getPaymentByAppointment, getAdminStats,
} from '../controllers/payment.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { requireCertificate } from '../middleware/requireCertificate';
import { validate } from '../middleware/validate';
import { createPaymentIntentSchema } from '../schemas/payment.schemas';

export const paymentRouter = Router();
const providerCertificates = ['THERAPIST', 'COUNSELOR'] as const;

paymentRouter.post('/create-intent', authenticate, authorize('MEMBER'), validate(createPaymentIntentSchema), createPaymentIntent);
paymentRouter.get('/connect/status', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate(providerCertificates), getConnectStatus);
paymentRouter.post('/connect/onboard', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate(providerCertificates), startConnectOnboarding);
paymentRouter.get('/connect/return', connectReturn);
paymentRouter.get('/connect/refresh', connectRefresh);
paymentRouter.get('/appointment/:id', authenticate, getPaymentByAppointment);
paymentRouter.get('/admin/stats', authenticate, authorize('ADMIN'), getAdminStats);
