import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { createWechatOrder, createPlanWechatOrder } from '../../api/wechat';
import { getAppointment } from '../../api/appointments';
import { getTherapyPlanSignupStatus } from '../../api/therapyPlans';
import { createWechatProductOrder, getOrder } from '../../api/shop';

interface WechatPaymentFormProps {
  appointmentId?: string;
  participantId?: string;
  orderId?: string;
  planId?: string;
  onSuccess: () => void;
  onError?: (msg: string) => void;
}

export const WechatPaymentForm = ({ appointmentId, participantId, orderId, planId, onSuccess, onError }: WechatPaymentFormProps) => {
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
      if (orderId) return createWechatProductOrder(orderId);
      if (participantId) return createPlanWechatOrder(participantId);
      if (appointmentId) return createWechatOrder(appointmentId);
      throw new Error('Missing required ID');
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      if (!status || status >= 500) {
        console.error('failed to load the payment', err);
      }
      onError?.(err?.response?.data?.message ?? err?.message ?? t('common.errors.tryAgain'));
    },
  });

  useEffect(() => {
    if (!targetKey) return;
    if (lastTriggeredTargetRef.current === targetKey) return;
    lastTriggeredTargetRef.current = targetKey;
    mutation.mutate();
  }, [mutation, targetKey]);

  const codeUrl = mutation.data?.codeUrl;

  // Poll status every 3 seconds
  const { data: pollData } = useQuery({
    queryKey: ['payment-poll', orderId ?? appointmentId ?? `plan:${planId ?? 'missing'}:participant:${participantId ?? 'missing'}`],
    queryFn: async () => {
      if (orderId) return getOrder(orderId);
      if (participantId) {
        if (!planId) throw new Error('Missing plan ID for plan payment polling');
        return getTherapyPlanSignupStatus(planId);
      }
      return getAppointment(appointmentId!);
    },
    enabled: !!codeUrl && (!!orderId || !!appointmentId || (!!participantId && !!planId)),
    refetchInterval: (query) => {
      const data = query.state.data as any;
      if (orderId) {
        return data?.status === 'PAID' ? false : 3000;
      }
      if (participantId) {
        return data?.payment?.status === 'SUCCEEDED' ? false : 3000;
      }
      return data?.status === 'CONFIRMED' ? false : 3000;
    },
  });

  useEffect(() => {
    if (orderId) {
      if ((pollData as any)?.status === 'PAID') {
        onSuccess();
      }
    } else if (participantId) {
      if ((pollData as any)?.payment?.status === 'SUCCEEDED') {
        onSuccess();
      }
    } else if ((pollData as any)?.status === 'CONFIRMED') {
      onSuccess();
    }
  }, [pollData, participantId, orderId, onSuccess]);

  if (mutation.isPending) {
    return (
      <div className="mt-4 flex flex-col items-center gap-3 py-6">
        <svg className="h-8 w-8 animate-spin text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-sm text-stone-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (mutation.isError) {
    return (
      <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
        {(mutation.error as any)?.response?.data?.message ?? (mutation.error as any)?.message ?? t('common.errors.tryAgain')}
      </div>
    );
  }

  if (mutation.isSuccess && !codeUrl) {
    return (
      <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
        {t('payment.wechatQrMissing', 'Unable to generate WeChat QR code. Please try again.')}
      </div>
    );
  }

  if (!codeUrl) {
    return (
      <div className="mt-4 flex flex-col items-center gap-3 py-6">
        <svg className="h-8 w-8 animate-spin text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-sm text-stone-500">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-4 py-4">
      <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-sm">
        <QRCode value={codeUrl} size={200} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-stone-700">
          {t('payment.wechatScanPrompt', 'Scan with WeChat to pay')}
        </p>
        <p className="text-xs text-stone-400 mt-1">
          {t('payment.wechatScanHint', 'Open WeChat → Scan → Complete payment')}
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-stone-400">
        <svg className="h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        {t('payment.waitingForPayment', 'Waiting for payment…')}
      </div>
    </div>
  );
};
