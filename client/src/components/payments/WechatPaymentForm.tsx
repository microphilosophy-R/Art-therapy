import React, { useEffect } from 'react';
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
  onSuccess: () => void;
  onError?: (msg: string) => void;
}

export const WechatPaymentForm = ({ appointmentId, participantId, orderId, onSuccess, onError }: WechatPaymentFormProps) => {
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: () => {
      if (orderId) return createWechatProductOrder(orderId);
      if (participantId) return createPlanWechatOrder(participantId);
      if (appointmentId) return createWechatOrder(appointmentId);
      throw new Error('Missing ID');
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

  // Poll status every 3 seconds
  const { data: pollData } = useQuery({
    queryKey: ['payment-poll', appointmentId ?? participantId ?? orderId],
    queryFn: async () => {
      if (orderId) return getOrder(orderId);
      if (participantId) return getTherapyPlanSignupStatus(participantId);
      return getAppointment(appointmentId!);
    },
    enabled: !!mutation.data?.codeUrl,
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
        {(mutation.error as any)?.message ?? t('common.errors.tryAgain')}
      </div>
    );
  }

  if (!mutation.data?.codeUrl) return null;

  return (
    <div className="mt-4 flex flex-col items-center gap-4 py-4">
      <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-sm">
        <QRCode value={mutation.data.codeUrl} size={200} />
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
