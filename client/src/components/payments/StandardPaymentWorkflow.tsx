import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ShieldCheck,
    Calendar,
    Clock,
    Info,
    CheckCircle2,
    CreditCard,
    ChevronRight,
    ChevronLeft,
    UserPlus
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { PaymentMethodSelector, type PaymentMethod } from './PaymentMethodSelector';
import { AlipayPaymentForm } from './AlipayPaymentForm';
import { WechatPaymentForm } from './WechatPaymentForm';
import { StripeUnavailable } from './StripeUnavailable';
import { PriceDisplay } from '../ui/PriceDisplay';
import { getDefaultPaymentMethod, paymentCapabilities } from '../../lib/payments';

export type PaymentWorkflowStep = 'TERMS' | 'TIME' | 'INFO' | 'PAYMENT' | 'RESULT';

type PaymentTarget = {
    appointmentId?: string;
    participantId?: string;
    orderId?: string;
    planId?: string;
};

interface StandardPaymentWorkflowProps {
    type: 'PERSONAL_CONSULT' | 'GROUP_CONSULT' | 'ART_SALON' | 'WELLNESS_RETREAT';
    data: {
        title: string;
        price: number;
        startTime: string;
        endTime?: string;
        location?: string;
        therapistName: string;
        therapistAvatar?: string;
        appointmentId?: string; // For personal consults
        participantId?: string; // For group plans
        orderId?: string; // For product orders
        planId?: string; // For plan signup status polling
    };
    onTimeStep?: () => React.ReactNode; // Custom time selection for personal consult
    onComplete?: (method: PaymentMethod) => Promise<PaymentTarget | { id?: string } | any>; // Function to generate order
    onCancel?: () => void;
}

export const StandardPaymentWorkflow: React.FC<StandardPaymentWorkflowProps> = ({
    type,
    data,
    onTimeStep,
    onComplete,
    onCancel
}) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [step, setStep] = useState<PaymentWorkflowStep>('TERMS');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
        getDefaultPaymentMethod(i18n.language.startsWith('zh'))
    );
    const [isProcessing, setIsProcessing] = useState(false);
    const [orderGenerated, setOrderGenerated] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [resolvedTarget, setResolvedTarget] = useState<PaymentTarget>({
        appointmentId: data.appointmentId,
        participantId: data.participantId,
        orderId: data.orderId,
        planId: data.planId,
    });

    const isZh = i18n.language.startsWith('zh');
    const locale = isZh ? 'zh-CN' : 'en-US';

    const formatWorkflowDate = (value: string) => {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return value;
        return parsed.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatWorkflowTime = (value: string) => {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return value;
        return parsed.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: !isZh,
        });
    };

    const isPersonal = type === 'PERSONAL_CONSULT';
    const showInviteCouponStep = !isPersonal;
    const paymentTarget = orderGenerated
        ? resolvedTarget
        : {
            appointmentId: data.appointmentId,
            participantId: data.participantId,
            orderId: data.orderId,
            planId: data.planId,
        };

    useEffect(() => {
        if (orderGenerated) return;
        setResolvedTarget({
            appointmentId: data.appointmentId,
            participantId: data.participantId,
            orderId: data.orderId,
            planId: data.planId,
        });
    }, [data.appointmentId, data.orderId, data.participantId, data.planId, orderGenerated]);

    // Decide steps based on type
    const steps: PaymentWorkflowStep[] = ['TERMS', 'TIME', 'INFO', 'PAYMENT'];
    // Personal consult skips INFO because invite/coupon is only for non-personal plan types.
    const currentStepIndex = steps.indexOf(step);

    const requestPaymentTarget = async (method: PaymentMethod) => {
        if (method === 'card' || orderGenerated || isProcessing) return;
        setIsProcessing(true);
        setCheckoutError(null);
        try {
            if (!onComplete) {
                if (data.appointmentId || data.participantId || data.orderId) {
                    setOrderGenerated(true);
                }
                return;
            }
            const completionResult = await onComplete(method);
            const nextTarget: PaymentTarget = {
                appointmentId: completionResult?.appointmentId ?? data.appointmentId,
                participantId: completionResult?.participantId ?? data.participantId,
                orderId: completionResult?.orderId ?? data.orderId,
                planId: completionResult?.planId ?? data.planId,
            };
            if (!nextTarget.appointmentId && !nextTarget.participantId && !nextTarget.orderId && typeof completionResult?.id === 'string') {
                if (type === 'PERSONAL_CONSULT') {
                    nextTarget.appointmentId = completionResult.id;
                } else {
                    nextTarget.participantId = completionResult.id;
                }
            }
            if (!nextTarget.appointmentId && !nextTarget.participantId && !nextTarget.orderId) {
                throw new Error('Missing payment target after checkout completion');
            }
            setResolvedTarget(nextTarget);
            setOrderGenerated(true);
        } catch (err: any) {
            console.error('Order generation failed', err);
            setCheckoutError(err?.response?.data?.message ?? err?.message ?? t('common.errors.tryAgain'));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSelectMethod = (method: PaymentMethod) => {
        setPaymentMethod(method);
        setCheckoutError(null);
        if (step === 'PAYMENT' && !orderGenerated) {
            void requestPaymentTarget(method);
        }
    };

    const handleNext = async () => {

        if (step === 'TERMS') {
            setStep('TIME');
        } else if (step === 'TIME') {
            if (showInviteCouponStep) {
                setStep('INFO');
            } else {
                setStep('PAYMENT');
                void requestPaymentTarget(paymentMethod);
            }
        } else if (step === 'INFO') {
            setStep('PAYMENT');
            void requestPaymentTarget(paymentMethod);
        }
    };

    const handleBack = () => {
        if (step === 'TIME') setStep('TERMS');
        else if (step === 'INFO') setStep('TIME');
        else if (step === 'PAYMENT') {
            if (showInviteCouponStep) setStep('INFO');
            else setStep('TIME');
        }
    };

    const renderProgress = () => {
        const activeSteps = steps.filter(s => showInviteCouponStep || s !== 'INFO');
        const currentIndex = activeSteps.indexOf(step);

        return (
            <div className="flex items-center justify-between mb-8 px-2">
                {activeSteps.map((s, idx) => (
                    <React.Fragment key={s}>
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${idx <= currentIndex ? 'bg-teal-600 text-white' : 'bg-stone-200 text-stone-500'
                                }`}>
                                {idx + 1}
                            </div>
                        </div>
                        {idx < activeSteps.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-2 ${idx < currentIndex ? 'bg-teal-600' : 'bg-stone-200'
                                }`} />
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    };

    return (
        <div className="max-w-2xl mx-auto py-4">
            {renderProgress()}

            <Card className="border-stone-200 shadow-sm overflow-hidden">
                {/* Header Summary */}
                <div className="bg-stone-50 border-b border-stone-200 p-4 flex items-center gap-4">
                    <div className="flex-1">
                        <h3 className="font-semibold text-stone-900">{data.title}</h3>
                        <p className="text-sm text-stone-500">{data.therapistName}</p>
                    </div>
                    <div className="text-right">
                        <PriceDisplay cnyAmount={data.price} className="text-lg font-bold text-teal-700" />
                    </div>
                </div>

                <CardContent className="p-6">
                    {step === 'TERMS' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-teal-700 mb-2">
                                <ShieldCheck className="h-5 w-5" />
                                <h2 className="text-lg font-semibold">{t('payment.acknowledgement')}</h2>
                            </div>
                            <div className="bg-stone-50 rounded-lg p-4 text-sm text-stone-600 max-h-60 overflow-y-auto border border-stone-200">
                                <p className="font-medium mb-2 text-stone-800">{t('common.planType.' + type)} {t('payment.tos_title')}</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>{t('payment.tos_item1')}</li>
                                    <li>{t('payment.cancellation_policy')}</li>
                                    <li>{t('payment.tos_item3')}</li>
                                    <li>{t('payment.tos_item4')}</li>
                                </ul>
                            </div>
                            <div className="flex items-start gap-3 mt-6">
                                <input
                                    type="checkbox"
                                    id="tos"
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
                                />
                                <label htmlFor="tos" className="text-sm text-stone-700 cursor-pointer">
                                    {t('payment.i_agree')}
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 'TIME' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-teal-700 mb-2">
                                <Calendar className="h-5 w-5" />
                                <h2 className="text-lg font-semibold">
                                    {isPersonal ? t('booking.step1.title') : t('payment.confirm_time')}
                                </h2>
                            </div>

                            {isPersonal ? (
                                onTimeStep ? onTimeStep() : (
                                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                                        <div className="flex items-center gap-3 mb-4">
                                                    <Clock className="h-5 w-5 text-teal-600" />
                                            <div>
                                                <p className="text-xs text-stone-500 uppercase font-bold tracking-wider">{t('booking.step3.time')}</p>
                                                <p className="text-lg font-medium text-stone-900">
                                                    {formatWorkflowDate(data.startTime)}{isZh ? ' ' : ', '}{formatWorkflowTime(data.startTime)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
                                        <p className="text-sm text-teal-800 mb-2 font-medium">{t('payment.scheduled_for')}</p>
                                        <div className="flex items-center gap-3">
                                            <Calendar className="h-5 w-5 text-teal-600" />
                                            <span className="text-stone-900 font-semibold">{formatWorkflowDate(data.startTime)}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                            <Clock className="h-5 w-5 text-teal-600" />
                                            <span className="text-stone-900 font-semibold">{formatWorkflowTime(data.startTime)} {data.endTime ? ` - ${formatWorkflowTime(data.endTime)}` : ''}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-xs text-amber-700 border border-amber-100">
                                        <Info className="h-4 w-4 shrink-0" />
                                        <span>{t('payment.group_confirm_notice')}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'INFO' && showInviteCouponStep && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-teal-700 mb-2">
                                <UserPlus className="h-5 w-5" />
                                <h2 className="text-lg font-semibold">{t('therapyPlans.signup.step2.title', 'Discount & Invitation')}</h2>
                            </div>

                            <div className="p-6 border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50 text-center">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                    <UserPlus className="h-6 w-6 text-stone-400" />
                                </div>
                                <h4 className="font-medium text-stone-900 mb-1">{t('payment.invite_friend')}</h4>
                                <p className="text-sm text-stone-500 mb-4">{t('payment.invite_desc')}</p>
                                <div className="bg-teal-50 text-teal-700 text-xs font-bold py-1 px-3 rounded-full inline-block uppercase tracking-wider">
                                    {t('common.comingSoon')}
                                </div>
                            </div>

                            <div className="p-4 bg-stone-100 rounded-lg">
                                <p className="text-xs text-stone-500 italic">
                                    {t('payment.skip_for_now')}
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 'PAYMENT' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-teal-700 mb-2">
                                <CreditCard className="h-5 w-5" />
                                <h2 className="text-lg font-semibold">{t('payment.final_check')}</h2>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-stone-100 text-sm">
                                    <span className="text-stone-500">{t('booking.step3.date')}</span>
                                    <span className="font-medium">{formatWorkflowDate(data.startTime)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-stone-100 text-sm">
                                    <span className="text-stone-500">{t('booking.step3.time')}</span>
                                    <span className="font-medium">{formatWorkflowTime(data.startTime)}</span>
                                </div>
                                <div className="flex justify-between py-3">
                                    <span className="font-bold text-stone-900">{t('booking.step3.total')}</span>
                                    <PriceDisplay cnyAmount={data.price} className="text-xl font-bold text-teal-700" />
                                </div>
                            </div>

                            {!orderGenerated ? (
                                <div className="mt-8">
                                    {checkoutError && (
                                        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                                            {checkoutError}
                                        </div>
                                    )}
                                    <p className="text-sm font-medium text-stone-700 mb-4">{t('payment.selectMethod')}</p>
                                    <PaymentMethodSelector
                                        alipayEnabled={paymentCapabilities.alipay}
                                        wechatEnabled={paymentCapabilities.wechat}
                                        selectedMethod={paymentMethod}
                                        onSelect={handleSelectMethod}
                                        isZh={i18n.language.startsWith('zh')}
                                    />
                                    {paymentMethod === 'card' && <StripeUnavailable />}
                                    {isProcessing && paymentMethod !== 'card' && (
                                        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-stone-500">
                                            <svg className="h-4 w-4 animate-spin text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                            </svg>
                                            {t('common.loading')}
                                        </div>
                                    )}
                                    {checkoutError && paymentMethod !== 'card' && (
                                        <div className="mt-4 flex justify-center">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => void requestPaymentTarget(paymentMethod)}
                                                disabled={isProcessing}
                                            >
                                                {t('common.retry')}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="mt-8 border-t border-stone-100 pt-6">
                                    {paymentMethod === 'alipay' && (
                                        <AlipayPaymentForm
                                            appointmentId={paymentTarget.appointmentId}
                                            participantId={paymentTarget.participantId}
                                            orderId={paymentTarget.orderId}
                                            onSuccess={() => navigate('/dashboard')}
                                            onError={() => setOrderGenerated(false)}
                                        />
                                    )}
                                    {paymentMethod === 'wechat' && (
                                        <WechatPaymentForm
                                            appointmentId={paymentTarget.appointmentId}
                                            participantId={paymentTarget.participantId}
                                            orderId={paymentTarget.orderId}
                                            planId={paymentTarget.planId}
                                            onSuccess={() => navigate('/dashboard')}
                                            onError={() => setOrderGenerated(false)}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>

                <CardFooter className="bg-stone-50 border-t border-stone-100 p-4 flex justify-between">
                    {step !== 'TERMS' && !orderGenerated ? (
                        <Button variant="ghost" onClick={handleBack} disabled={isProcessing}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> {t('common.back')}
                        </Button>
                    ) : (
                        <Button variant="ghost" onClick={onCancel} disabled={isProcessing || orderGenerated}>
                            {t('common.cancel')}
                        </Button>
                    )}

                    {step !== 'PAYMENT' && (
                        <Button
                            disabled={step === 'TERMS' && !termsAccepted}
                            onClick={handleNext}
                            className="ml-auto"
                        >
                            {t('common.next')} <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};
