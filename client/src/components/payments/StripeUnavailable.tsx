import React from 'react';
import { useTranslation } from 'react-i18next';

export const StripeUnavailable = () => {
  const { t } = useTranslation();

  return (
    <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-5 flex items-start gap-3">
      <div className="shrink-0 mt-0.5">
        <svg className="h-5 w-5 text-stone-400" viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-stone-700">
          {t('payment.cardUnavailableTitle', 'Card payment not available')}
        </p>
        <p className="text-sm text-stone-500 mt-0.5">
          {t('payment.cardUnavailableDesc', 'Sorry, we don\'t provide this service now. Please use Alipay or WeChat Pay.')}
        </p>
      </div>
    </div>
  );
};
