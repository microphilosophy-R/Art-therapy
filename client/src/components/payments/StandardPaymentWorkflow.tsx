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
import { PriceDisplay } from '../ui/PriceDisplay';
import { formatDate, formatTime } from '../../utils/formatters';

export type PaymentWorkflowStep = 'TERMS' | 'TIME' | 'INFO' | 'PAYMENT' | 'RESULT';

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
    };
    onTimeStep?: () => React.ReactNode; // Custom time selection for personal consult
    onComplete?: (method: PaymentMethod) => Promise<any>; // Function to generate order
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
        i18n.language.startsWith('zh') ? 'alipay' : 'alipay'
    );
    const [isProcessing, setIsProcessing] = useState(false);
    const [orderGenerated, setOrderGenerated] = useState(false);

    const isPersonal = type === 'PERSONAL_CONSULT';

    // Decide steps based on type
    const steps: PaymentWorkflowStep[] = ['TERMS', 'TIME', 'INFO', 'PAYMENT'];
    // b/c/d skip INFO step according to requirement "the b/c/d will automatically skip"
    const currentStepIndex = steps.indexOf(step);

    const handleNext = async () => {
        if (step === 'TERMS') {
            setStep('TIME');
        } else if (step === 'TIME') {
            if (isPersonal) {
                setStep('INFO');
            } else {
                setStep('PAYMENT');
            }
        } else if (step === 'INFO') {
            setStep('PAYMENT');
        } else if (step === 'PAYMENT') {
            if (onComplete) {
                setIsProcessing(true);
                try {
                    await onComplete(paymentMethod);
                    setOrderGenerated(true);
                } catch (err) {
                    console.error('Order generation failed', err);
                } finally {
                    setIsProcessing(false);
                }
            }
        }
    };

    const handleBack = () => {
        if (step === 'TIME') setStep('TERMS');
        else if (step === 'INFO') setStep('TIME');
        else if (step === 'PAYMENT') {
            if (isPersonal) setStep('INFO');
            else setStep('TIME');
        }
    };

    const renderProgress = () => {
        const activeSteps = steps.filter(s => isPersonal || s !== 'INFO');
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
                                <h2 className="text-lg font-semibold">{t('payment.acknowledgement', 'Service Terms Acknowledgement')}</h2>
                            </div>
                            <div className="bg-stone-50 rounded-lg p-4 text-sm text-stone-600 max-h-60 overflow-y-auto border border-stone-200">
                                <p className="font-medium mb-2 text-stone-800">{t('common.planType.' + type)} {t('payment.tos_title', 'Terms of Service')}</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>{t('payment.tos_item1', 'By proceeding, you agree to our privacy policy and the specific terms for this service.')}</li>
                                    <li>{t('payment.tos_item2', 'Cancellations made less than 24 hours before the session may not be eligible for a refund.')}</li>
                                    <li>{t('payment.tos_item3', 'For group events, the therapist reserves the right to reschedule if minimum participation is not met.')}</li>
                                    <li>{t('payment.tos_item4', 'Your personal information is handled according to HIPAA and relevant privacy standards.')}</li>
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
                                    {t('payment.i_agree', 'I have read and agree to the Terms of Service and Privacy Policy.')}
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 'TIME' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-teal-700 mb-2">
                                <Calendar className="h-5 w-5" />
                                <h2 className="text-lg font-semibold">
                                    {isPersonal ? t('booking.step1.title') : t('payment.confirm_time', 'Confirm Schedule')}
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
                                                    {formatDate(data.startTime)}, {formatTime(data.startTime)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
                                        <p className="text-sm text-teal-800 mb-2 font-medium">{t('payment.scheduled_for', 'The event is scheduled for:')}</p>
                                        <div className="flex items-center gap-3">
                                            <Calendar className="h-5 w-5 text-teal-600" />
                                            <span className="text-stone-900 font-semibold">{formatDate(data.startTime)}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                            <Clock className="h-5 w-5 text-teal-600" />
                                            <span className="text-stone-900 font-semibold">{formatTime(data.startTime)} {data.endTime ? ` - ${formatTime(data.endTime)}` : ''}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-xs text-amber-700 border border-amber-100">
                                        <Info className="h-4 w-4 shrink-0" />
                                        <span>{t('payment.group_confirm_notice', 'Please ensure you can attend at this specific time. Group plans have fixed schedules.')}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'INFO' && isPersonal && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-teal-700 mb-2">
                                <UserPlus className="h-5 w-5" />
                                <h2 className="text-lg font-semibold">{t('payment.extra_info', 'Additional Information')}</h2>
                            </div>

                            <div className="p-6 border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50 text-center">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                    <UserPlus className="h-6 w-6 text-stone-400" />
                                </div>
                                <h4 className="font-medium text-stone-900 mb-1">{t('payment.invite_friend', 'Invite a Friend')}</h4>
                                <p className="text-sm text-stone-500 mb-4">{t('payment.invite_desc', 'Coming soon: You will be able to invite a friend to this session and receive a collaborative discount.')}</p>
                                <div className="bg-teal-50 text-teal-700 text-xs font-bold py-1 px-3 rounded-full inline-block uppercase tracking-wider">
                                    {t('common.comingSoon', 'Coming Soon')}
                                </div>
                            </div>

                            <div className="p-4 bg-stone-100 rounded-lg">
                                <p className="text-xs text-stone-500 italic">
                                    {t('payment.skip_for_now', 'This page will automatically skip for group sessions, art salons, and wellness retreats.')}
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 'PAYMENT' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-teal-700 mb-2">
                                <CreditCard className="h-5 w-5" />
                                <h2 className="text-lg font-semibold">{t('payment.final_check', 'Final Review & Payment')}</h2>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-stone-100 text-sm">
                                    <span className="text-stone-500">{t('booking.step3.date')}</span>
                                    <span className="font-medium">{formatDate(data.startTime)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-stone-100 text-sm">
                                    <span className="text-stone-500">{t('booking.step3.time')}</span>
                                    <span className="font-medium">{formatTime(data.startTime)}</span>
                                </div>
                                <div className="flex justify-between py-3">
                                    <span className="font-bold text-stone-900">{t('booking.step3.total')}</span>
                                    <PriceDisplay cnyAmount={data.price} className="text-xl font-bold text-teal-700" />
                                </div>
                            </div>

                            {!orderGenerated ? (
                                <div className="mt-8">
                                    <p className="text-sm font-medium text-stone-700 mb-4">{t('payment.selectMethod')}</p>
                                    <PaymentMethodSelector
                                        alipayWechatEnabled={true}
                                        selectedMethod={paymentMethod}
                                        onSelect={setPaymentMethod}
                                        isZh={i18n.language.startsWith('zh')}
                                    />
                                    <div className="mt-6">
                                        <Button
                                            className="w-full h-12 text-lg"
                                            onClick={handleNext}
                                            loading={isProcessing}
                                            disabled={!paymentMethod}
                                        >
                                            {t('payment.confirmAndPay', 'Confirm Payment')}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-8 border-t border-stone-100 pt-6">
                                    {paymentMethod === 'alipay' && (
                                        <AlipayPaymentForm
                                            appointmentId={data.appointmentId}
                                            participantId={data.participantId}
                                            onSuccess={() => navigate('/dashboard')}
                                            onError={() => setOrderGenerated(false)}
                                        />
                                    )}
                                    {paymentMethod === 'wechat' && (
                                        <WechatPaymentForm
                                            appointmentId={data.appointmentId}
                                            participantId={data.participantId}
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
