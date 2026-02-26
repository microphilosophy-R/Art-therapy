import { Router } from 'express';
import { createWechatOrder, getWechatOrder } from '../controllers/wechat.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const createOrderSchema = z.object({ appointmentId: z.string().cuid() });

export const wechatRouter = Router();

wechatRouter.post(
  '/create-order',
  authenticate,
  authorize('CLIENT'),
  validate(createOrderSchema),
  createWechatOrder
);
wechatRouter.get('/order/:id', authenticate, getWechatOrder);
