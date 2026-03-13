import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { createAlipayOrder, createPlanAlipayOrder } from '../../api/alipay';
import { createAlipayProductOrder } from '../../api/shop';

interface AlipayPaymentFormProps {
  appointmentId?: string;
  participantId?: string;
  orderId?: string;
  onSuccess: () => void;
  onError?: (msg: string) => void;
}

export const AlipayPaymentForm = ({ appointmentId, participantId, orderId, onSuccess, onError }: AlipayPaymentFormProps) => {
  const { t } = useTranslation();
  const lastTriggeredTargetRef = useRef<string | null>(null);
  const targetKey = useMemo(() => {
    if (orderId) return `order:${orderId}`;
    if (participantId) return `participant:${participantId}`;
    if (appointmentId) return `appointment:${appointmentId}`;
    return null;
  }, [appointmentId, orderId, participantId]);

  const mutation = useMutation({
    mutationFn: () => {
      if (orderId) return createAlipayProductOrder(orderId);
      if (participantId) return createPlanAlipayOrder(participantId);
      if (appointmentId) return createAlipayOrder(appointmentId);
      throw new Error('Missing required ID');
    },
    onSuccess: ({ payUrl }) => {
      window.location.href = payUrl;
    },
    onError: (err: any) => {
      onError?.(err?.response?.data?.message ?? err?.message ?? t('common.errors.tryAgain'));
    },
  });

  useEffect(() => {
    if (!targetKey) return;
    if (lastTriggeredTargetRef.current === targetKey) return;
    lastTriggeredTargetRef.current = targetKey;
    mutation.mutate();
  }, [mutation, targetKey]);

  if (mutation.isError) {
    return (
      <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
        {(mutation.error as any)?.response?.data?.message ?? (mutation.error as any)?.message ?? t('common.errors.tryAgain')}
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
