import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { requireCertificate } from '../../middleware/requireCertificate';
import { validate } from '../../middleware/validate';
import { RefundController } from '../../controllers/shop';

const router = Router();

router.post(
  '/orders/:id/request-refund',
  authenticate,
  validate(RefundController.requestRefundSchema),
  RefundController.requestRefund,
);
router.post(
  '/seller/orders/:id/approve-refund',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate('ARTIFICER'),
  RefundController.approveRefund,
);
router.post(
  '/seller/orders/:id/reject-refund',
  authenticate,
  authorize('MEMBER', 'ADMIN'),
  requireCertificate('ARTIFICER'),
  validate(RefundController.rejectRefundSchema),
  RefundController.rejectRefund,
);

export { router as refundRouter };

