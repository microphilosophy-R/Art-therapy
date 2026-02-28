import { Router } from 'express';
import { createAlipayOrder, createPlanAlipayOrder, getAlipayOrder } from '../controllers/alipay.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const createOrderSchema = z.object({ appointmentId: z.string().cuid() });
const createPlanOrderSchema = z.object({ planId: z.string().cuid() });

export const alipayRouter = Router();

alipayRouter.post(
  '/create-order',
  authenticate,
  authorize('CLIENT'),
  validate(createOrderSchema),
  createAlipayOrder
);

alipayRouter.post(
  '/create-plan-order',
  authenticate,
  authorize('CLIENT'),
  validate(createPlanOrderSchema),
  createPlanAlipayOrder
);
alipayRouter.get('/order/:id', authenticate, getAlipayOrder);
