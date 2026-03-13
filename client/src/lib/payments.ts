import type { PaymentMethod } from '../components/payments/PaymentMethodSelector';

const alipayWechatEnabled = String(import.meta.env.VITE_ALIPAY_WECHAT_ENABLED ?? '').toLowerCase() === 'true';

export const paymentCapabilities = {
  alipay: alipayWechatEnabled,
  wechat: true,
} as const;

export const getDefaultPaymentMethod = (isZh: boolean): Exclude<PaymentMethod, null | 'card'> => {
  if (isZh && paymentCapabilities.alipay) return 'alipay';
  return 'wechat';
};
