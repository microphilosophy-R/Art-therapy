import { AlipaySdk } from 'alipay-sdk';

export const ALIPAY_ENABLED = process.env.ALIPAY_ENABLED === 'true';

export const alipay = ALIPAY_ENABLED
  ? new AlipaySdk({
      appId: process.env.ALIPAY_APP_ID!,
      privateKey: process.env.ALIPAY_PRIVATE_KEY!,
      alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY!,
      gateway: 'https://openapi.alipay.com/gateway.do',
    })
  : null;
