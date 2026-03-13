import { Wechatpay } from 'wechatpay-axios-plugin';
import { getWechatConfigInputs, getWechatDiagnostics } from './wechatDiagnostics';

const diagnostics = getWechatDiagnostics();
const cfg = getWechatConfigInputs();
const WECHAT_ENV_ENABLED = diagnostics.initializationPossible;

let wechatpayInstance: Wechatpay | null = null;
if (WECHAT_ENV_ENABLED) {
  try {
    wechatpayInstance = new Wechatpay({
      mchid: cfg.mchId,
      serial: cfg.certSerial,
      privateKey: cfg.privateKeyPem,
      certs: {
        [cfg.platformSerial]: cfg.platformCertPem,
      },
    });
  } catch (error: any) {
    console.error(`[WeChat] initialization failed: ${error?.message ?? error}`);
    wechatpayInstance = null;
  }
} else if (diagnostics.enabledFlag) {
  console.warn(`[WeChat] configuration invalid: ${diagnostics.issues.join('; ')}`);
}

export const WECHAT_ENABLED = !!wechatpayInstance;
export const wechatpay = wechatpayInstance;
