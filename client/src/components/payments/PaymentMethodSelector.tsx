import React from 'react';
import { useTranslation } from 'react-i18next';

// Alipay logo
const AlipayIcon = () => (
  <img src="/alipay-logo.svg" alt="Alipay" className="h-6 w-6 rounded object-cover" loading="lazy" />
);

// WeChat Pay SVG logo
const WechatIcon = () => (
  <svg viewBox="0 0 48 48" className="h-6 w-6" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="8" fill="#07C160" />
    <text x="24" y="32" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="sans-serif">微信</text>
  </svg>
);

// Card / Stripe icon
const CardIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
);

export type PaymentMethod = 'alipay' | 'wechat' | 'card' | null;

interface PaymentMethodSelectorProps {
  alipayWechatEnabled?: boolean;
  alipayEnabled?: boolean;
  wechatEnabled?: boolean;
  selectedMethod: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  isZh: boolean;
}

export const PaymentMethodSelector = ({
  alipayWechatEnabled,
  alipayEnabled,
  wechatEnabled,
  selectedMethod,
  onSelect,
  isZh,
}: PaymentMethodSelectorProps) => {
  const { t } = useTranslation();
  const supportsAlipay = alipayEnabled ?? alipayWechatEnabled ?? true;
  const supportsWechat = wechatEnabled ?? alipayWechatEnabled ?? true;

  const methods: Array<{
    id: 'alipay' | 'wechat' | 'card';
    icon: React.ReactNode;
    label: string;
    enabled: boolean;
    comingSoon?: boolean;
    unavailable?: boolean;
  }> = [
    {
      id: 'alipay',
      icon: <AlipayIcon />,
      label: t('payment.alipay', '支付�?Alipay'),
      enabled: supportsAlipay,
      comingSoon: !supportsAlipay,
    },
    {
      id: 'wechat',
      icon: <WechatIcon />,
      label: t('payment.wechat', '微信支付 WeChat Pay'),
      enabled: supportsWechat,
      comingSoon: !supportsWechat,
    },
    {
      id: 'card',
      icon: <CardIcon />,
      label: t('payment.card', 'Credit / Debit Card'),
      enabled: true, // always clickable �?shows "unavailable" message
      unavailable: true,
    },
  ];

  return (
    <div className="mb-5">
      <p className="text-sm font-medium text-stone-700 mb-3">
        {t('payment.selectMethod', 'Select payment method')}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {methods.map((m) => {
          const isSelected = selectedMethod === m.id;
          const isDefault = isZh && m.id === 'alipay' && selectedMethod === null;

          return (
            <button
              key={m.id}
              type="button"
              disabled={m.comingSoon}
              onClick={() => m.enabled && onSelect(m.id)}
              className={[
                'relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-xs font-medium transition-colors',
                isSelected || isDefault
                  ? 'border-teal-600 bg-teal-50 text-teal-700'
                  : m.comingSoon
                  ? 'border-stone-200 bg-stone-50 text-stone-400 cursor-not-allowed opacity-60'
                  : m.unavailable
                  ? 'border-stone-200 bg-white text-stone-500 hover:border-stone-300 cursor-pointer'
                  : 'border-stone-200 bg-white text-stone-700 hover:border-teal-400',
              ].join(' ')}
            >
              {m.icon}
              <span>{m.label}</span>
              {m.comingSoon && (
                <span className="absolute top-1 right-1 bg-stone-200 text-stone-500 text-[9px] px-1 rounded">
                  {t('payment.comingSoon', 'Soon')}
                </span>
              )}
              {m.unavailable && (
                <span className="absolute top-1 right-1 text-stone-300">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

