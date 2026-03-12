import { Router, Request, Response } from 'express';
import { Aes } from 'wechatpay-axios-plugin';
import * as wechatService from '../services/wechat.service';
import { WECHAT_ENABLED } from '../lib/wechat';

export const wechatWebhookRouter = Router();

// WeChat Pay v3 sends an AES-GCM encrypted JSON body.
// express.raw() is applied in app.ts before this router.
wechatWebhookRouter.post('/', async (req: Request, res: Response) => {
  if (!WECHAT_ENABLED) {
    return res.status(200).json({ code: 'SUCCESS', message: 'Disabled' });
  }

  try {
    const body = JSON.parse(req.body.toString());
    const { resource } = body;

    // Decrypt the notification payload using AES-GCM
    const apiV3Key = process.env.WECHAT_API_V3_KEY!;
    const decrypted = Aes.AesGcm.decrypt(
      resource.nonce,
      apiV3Key,
      resource.ciphertext,
      resource.associated_data
    );
    const decryptedBody = JSON.parse(decrypted);

    await wechatService.handleWechatNotification(decryptedBody);

    res.status(200).json({ code: 'SUCCESS' });
  } catch (err: any) {
    console.error('[WeChat Webhook]', err.message);
    res.status(200).json({ code: 'FAIL', message: err.message });
  }
});
