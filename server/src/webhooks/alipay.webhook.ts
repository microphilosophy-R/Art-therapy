import { Router, Request, Response } from 'express';
import * as alipayService from '../services/alipay.service';
import { ALIPAY_WECHAT_ENABLED } from '../lib/alipay';

export const alipayWebhookRouter = Router();

// Alipay sends form-encoded POST notifications.
// express.urlencoded() is applied in app.ts before this router.
alipayWebhookRouter.post('/', async (req: Request, res: Response) => {
  if (!ALIPAY_WECHAT_ENABLED) {
    return res.status(200).send('success');
  }

  try {
    const result = await alipayService.handleAlipayNotification(req.body);
    res.status(200).send(result);
  } catch (err: any) {
    console.error('[Alipay Webhook]', err.message);
    res.status(200).send('fail'); // Alipay expects 'fail' on error (not 4xx/5xx)
  }
});
