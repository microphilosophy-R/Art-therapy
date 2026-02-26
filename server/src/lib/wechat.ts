import { Wechatpay } from 'wechatpay-axios-plugin';
export { ALIPAY_WECHAT_ENABLED } from './alipay';

export const wechatpay = process.env.ALIPAY_WECHAT_ENABLED === 'true'
  ? new Wechatpay({
      mchid: process.env.WECHAT_MCH_ID!,
      serial: process.env.WECHAT_CERT_SERIAL!,
      privateKey: process.env.WECHAT_PRIVATE_KEY!,
      certs: {
        [process.env.WECHAT_PLATFORM_SERIAL!]: process.env.WECHAT_PLATFORM_CERT!,
      },
    })
  : null;
