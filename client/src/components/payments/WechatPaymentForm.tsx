import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
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

const wechatQrCache = new Map<string, string>();
const wechatPendingTargets = new Set<string>();
const wechatRequestedTargets = new Set<string>();

const clearTargetState = (targetKey: string) => {
  wechatQrCache.delete(targetKey);
  wechatPendingTargets.delete(targetKey);
  wechatRequestedTargets.delete(targetKey);
};

const extractWechatQrUrl = (payload: any): string | null => {
  const qr =
    payload?.codeUrl ??
    payload?.code_url ??
    payload?.qrCode ??
    payload?.qrcode ??
    payload?.data?.codeUrl ??
    payload?.data?.code_url ??
    payload?.data?.qrCode ??
    payload?.data?.qrcode;
  return typeof qr === 'string' && qr.trim() ? qr : null;
};

export const WechatPaymentForm = ({ appointmentId, participantId, orderId, planId, onSuccess, onError }: WechatPaymentFormProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [resolvedCodeUrl, setResolvedCodeUrl] = useState<string | null>(null);
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
      if (status === 401) {
        const authErrorMessage = t('auth.loginRequired');
        onError?.(authErrorMessage);
        navigate('/login', { replace: true, state: { from: `${location.pathname}${location.search}` } });
        return;
      }
      if (!status || status >= 500) {
        console.error('failed to load the payment', err);
      }
      const timeoutMessage = t('payment.wechatTimeout');
      const message = err?.code === 'ECONNABORTED'
        ? timeoutMessage
        : (err?.response?.data?.message ?? err?.message ?? t('common.errors.tryAgain'));
      onError?.(message);
    },
    onSuccess: (data: any) => {
      const qr = extractWechatQrUrl(data);
      if (qr && targetKey) {
        wechatQrCache.set(targetKey, qr);
        setResolvedCodeUrl(qr);
      }
    },
  });

  useEffect(() => {
    if (!targetKey) return;

    const cachedQr = wechatQrCache.get(targetKey) ?? null;
    setResolvedCodeUrl(cachedQr);
    if (cachedQr) return;

    if (wechatRequestedTargets.has(targetKey)) return;
    wechatRequestedTargets.add(targetKey);

    if (wechatPendingTargets.has(targetKey)) return;
    wechatPendingTargets.add(targetKey);
    mutation.mutate(undefined, {
      onSettled: () => {
        wechatPendingTargets.delete(targetKey);
      },
    });
  }, [mutation, targetKey]);

  const payload = mutation.data as any;
  const codeUrl = resolvedCodeUrl ?? extractWechatQrUrl(payload);

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

  if (mutation.isPending && !codeUrl) {
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
    const timeoutMessage = t('payment.wechatTimeout');
    const authErrorMessage = t('auth.loginRequired');
    const status = (mutation.error as any)?.response?.status;
    const errorMessage = status === 401
      ? authErrorMessage
      : ((mutation.error as any)?.code === 'ECONNABORTED'
        ? timeoutMessage
        : ((mutation.error as any)?.response?.data?.message ?? (mutation.error as any)?.message ?? t('common.errors.tryAgain')));
    return (
      <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
        {errorMessage}
      </div>
    );
  }

  if (mutation.isSuccess && !codeUrl) {
    return (
      <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
        {t('payment.wechatQrMissing')}
      </div>
    );
  }

  if (mutation.status === 'idle' || !codeUrl) {
    return (
      <div className="mt-4 flex flex-col items-center gap-3 py-6 text-center">
        <p className="text-sm text-stone-500">{t('payment.wechatQrMissing')}</p>
        <button
          type="button"
          onClick={() => {
            if (targetKey) {
              clearTargetState(targetKey);
            }
            setResolvedCodeUrl(null);
            mutation.reset();
            mutation.mutate();
          }}
          className="inline-flex items-center rounded-md bg-celadon-600 px-4 py-2 text-sm font-medium text-white hover:bg-celadon-700"
        >
          {t('common.retry')}
        </button>
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
          {t('payment.wechatScanPrompt')}
        </p>
        <p className="text-xs text-stone-400 mt-1">
          {t('payment.wechatScanHint')}
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-stone-400">
        <svg className="h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        {t('payment.waitingForPayment')}
      </div>
    </div>
  );
};
