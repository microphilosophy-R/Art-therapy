import { Router } from 'express';
import { createAlipayOrder, getAlipayOrder } from '../controllers/alipay.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const createOrderSchema = z.object({ appointmentId: z.string().cuid() });

export const alipayRouter = Router();

alipayRouter.post(
  '/create-order',
  authenticate,
  authorize('CLIENT'),
  validate(createOrderSchema),
  createAlipayOrder
);
alipayRouter.get('/order/:id', authenticate, getAlipayOrder);
