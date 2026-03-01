import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import * as alipayController from '../controllers/alipay.controller';

export const alipayRouter = Router();

alipayRouter.use(authenticate);
alipayRouter.post('/create-order', alipayController.createAlipayOrderController);
alipayRouter.post('/create-plan-order', alipayController.createPlanAlipayOrderController);
alipayRouter.post('/create-product-order', alipayController.createProductAlipayOrderController);
