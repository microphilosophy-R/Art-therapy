import { Wechatpay } from 'wechatpay-axios-plugin';

export const WECHAT_ENABLED = process.env.WECHAT_ENABLED === 'true';

export const wechatpay = WECHAT_ENABLED
  ? new Wechatpay({
      mchid: process.env.WECHAT_MCH_ID!,
      serial: process.env.WECHAT_CERT_SERIAL!,
      privateKey: process.env.WECHAT_PRIVATE_KEY!,
      certs: {
        [process.env.WECHAT_PLATFORM_SERIAL!]: process.env.WECHAT_PLATFORM_CERT!,
      },
    })
  : null;
