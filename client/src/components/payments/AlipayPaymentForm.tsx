import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { createAlipayOrder } from '../../api/alipay';

interface AlipayPaymentFormProps {
  appointmentId: string;
  onSuccess: () => void;
  onError?: (msg: string) => void;
}

export const AlipayPaymentForm = ({ appointmentId, onSuccess, onError }: AlipayPaymentFormProps) => {
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: () => createAlipayOrder(appointmentId),
    onSuccess: ({ payUrl }) => {
      // Redirect browser to Alipay payment page
      window.location.href = payUrl;
    },
    onError: (err: any) => {
      onError?.(err.message ?? t('common.errors.tryAgain'));
    },
  });

  // Auto-trigger order creation on mount
  useEffect(() => {
    mutation.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (mutation.isError) {
    return (
      <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
        {(mutation.error as any)?.message ?? t('common.errors.tryAgain')}
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-3 py-6">
      <svg className="h-8 w-8 animate-spin text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <p className="text-sm text-stone-500">{t('payment.redirectingToAlipay', 'Redirecting to Alipay…')}</p>
    </div>
  );
};
