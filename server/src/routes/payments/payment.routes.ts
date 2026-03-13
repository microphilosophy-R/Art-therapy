import { Router } from 'express';
import { paymentController } from '../../controllers';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { requireCertificate } from '../../middleware/requireCertificate';
import { validate } from '../../middleware/validate';
import { createPaymentIntentSchema } from '../../schemas/payment.schemas';

export const paymentRouter = Router();
const providerCertificates = ['THERAPIST', 'COUNSELOR'] as const;

paymentRouter.post('/create-intent', authenticate, authorize('MEMBER'), validate(createPaymentIntentSchema), paymentController.createPaymentIntent);
paymentRouter.get('/connect/status', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate(providerCertificates), paymentController.getConnectStatus);
paymentRouter.post('/connect/onboard', authenticate, authorize('MEMBER', 'ADMIN'), requireCertificate(providerCertificates), paymentController.startConnectOnboarding);
paymentRouter.get('/connect/return', paymentController.connectReturn);
paymentRouter.get('/connect/refresh', paymentController.connectRefresh);
paymentRouter.get('/appointment/:id', authenticate, paymentController.getPaymentByAppointment);
paymentRouter.get('/admin/stats', authenticate, authorize('ADMIN'), paymentController.getAdminStats);

