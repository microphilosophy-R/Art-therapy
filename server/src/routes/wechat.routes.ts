import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import * as wechatController from '../controllers/wechat.controller';

export const wechatRouter = Router();

wechatRouter.use(authenticate);
wechatRouter.post('/create-order', wechatController.createWechatOrderController);
wechatRouter.post('/create-plan-order', wechatController.createPlanWechatOrderController);
wechatRouter.post('/create-product-order', wechatController.createProductWechatOrderController);
