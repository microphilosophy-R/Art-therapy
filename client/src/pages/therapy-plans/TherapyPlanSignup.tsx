import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    ChevronLeft, Calendar, Clock, Video, MapPin, Info, CheckCircle, Shield,
} from 'lucide-react';
import { getTherapyPlan, signUpForTherapyPlan } from '../../api/therapyPlans';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { PageLoader } from '../../components/ui/Spinner';
import { PaymentMethodSelector, type PaymentMethod } from '../../components/payments/PaymentMethodSelector';
import { StripeUnavailable } from '../../components/payments/StripeUnavailable';
import { AlipayPaymentForm } from '../../components/payments/AlipayPaymentForm';
import { WechatPaymentForm } from '../../components/payments/WechatPaymentForm';
import { PriceDisplay } from '../../components/ui/PriceDisplay';
import { formatDate, formatTime } from '../../utils/formatters';

type Step = 1 | 2 | 3 | 4;

export const TherapyPlanSignup = () => {
    const { t, i18n } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [step, setStep] = useState<Step>(1);
    const [signature, setSignature] = useState('');
    const [discountCode, setDiscountCode] = useState('');
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(i18n.language.startsWith('zh') ? 'alipay' : null);
    const [signupResult, setSignupResult] = useState<{ participantId: string; payment?: any } | null>(null);

    const { data: plan, isLoading } = useQuery({
        queryKey: ['therapy-plan', id],
        queryFn: () => getTherapyPlan(id!),
        enabled: !!id,
    });

    const signupMutation = useMutation({
        mutationFn: () => signUpForTherapyPlan(id!, {
            paymentProvider: selectedMethod === 'wechat' ? 'WECHAT_PAY' : 'ALIPAY',
        }),
        onSuccess: (data) => {
            if (data.payment) {
                setSignupResult({ participantId: data.participant.id, payment: data.payment });
            } else {
                // Free plan, direct success
                navigate('/dashboard/client');
            }
        },
    });

    if (isLoading) return <PageLoader />;
    if (!plan) return null;

    const steps = [
        { n: 1, label: t('therapyPlans.signup.steps.attention', 'Attention') },
        { n: 2, label: t('therapyPlans.signup.steps.discount', 'Discount') },
        { n: 3, label: t('therapyPlans.signup.steps.review', 'Review') },
        { n: 4, label: t('therapyPlans.signup.steps.pay', 'Payment') },
    ];

    const handlePaymentSuccess = () => {
        navigate('/dashboard/client');
    };

    const handlePaymentError = (msg: string) => {
        console.error('Payment error:', msg);
    };

    const priceDisplay = plan.price != null
        ? `¥${Number(plan.price).toFixed(2)}`
        : null;

    return (
        <div className="bg-stone-50 min-h-screen">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <button
                    onClick={() => (step === 1 ? navigate(-1) : setStep((s) => (s - 1) as Step))}
                    className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-6"
                >
                    <ChevronLeft className="h-4 w-4" />
                    {step === 1 ? t('therapyPlans.detail.back') : t('common.back')}
                </button>

                <h1 className="text-2xl font-bold text-stone-900 mb-1">{t('therapyPlans.detail.signUp')}</h1>
                <p className="text-stone-500 text-sm mb-6">{plan.title}</p>

                {/* Step indicator */}
                <div className="flex items-center gap-0 mb-8">
                    {steps.map((s, i) => (
                        <React.Fragment key={s.n}>
                            <div className="flex flex-col items-center">
                                <div
                                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${step === s.n
                                        ? 'bg-teal-600 text-white'
                                        : step > s.n
                                            ? 'bg-teal-100 text-teal-700'
                                            : 'bg-stone-200 text-stone-400'
                                        }`}
                                >
                                    {s.n}
                                </div>
                                <span className="text-xs text-stone-500 mt-1 hidden sm:block">{s.label}</span>
                            </div>
                            {i < steps.length - 1 && (
                                <div
                                    className={`flex-1 h-0.5 mx-1 transition-colors ${step > s.n ? 'bg-teal-300' : 'bg-stone-200'
                                        }`}
                                />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Step 1: Notes for Attention / Signature */}
                {step === 1 && (
                    <Card>
                        <CardContent className="p-6 space-y-6">
                            <h2 className="font-semibold text-stone-900 flex items-center gap-2">
                                <Shield className="h-5 w-5 text-teal-600" /> {t('therapyPlans.signup.step1.title', 'Notes for Attention')}
                            </h2>
                            <div className="prose prose-sm text-stone-600 max-w-none bg-stone-50 p-4 rounded-lg border border-stone-200">
                                <p>{t('therapyPlans.signup.step1.desc', 'By signing up for this therapy plan, you agree to the following terms:')}</p>
                                <ul className="list-disc pl-5 space-y-2 mt-2">
                                    <li>{t('therapyPlans.signup.step1.term1', 'Punctuality is expected for all sessions.')}</li>
                                    <li>{t('therapyPlans.signup.step1.term2', 'Full participation is encouraged for the best results.')}</li>
                                    <li>{t('therapyPlans.signup.step1.term3', 'Confidentiality of other participants must be respected.')}</li>
                                </ul>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-2">
                                    {t('therapyPlans.signup.step1.signatureLabel', 'Please type your full name to acknowledge (Signature)')}
                                </label>
                                <input
                                    type="text"
                                    value={signature}
                                    onChange={(e) => setSignature(e.target.value)}
                                    placeholder={t('therapyPlans.signup.step1.signaturePlaceholder', 'Your full name')}
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button disabled={!signature.trim()} onClick={() => setStep(2)}>
                                    {t('common.continue')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Invitation & Discount */}
                {step === 2 && (
                    <Card>
                        <CardContent className="p-6 space-y-6">
                            <h2 className="font-semibold text-stone-900 flex items-center gap-2">
                                <Info className="h-5 w-5 text-teal-600" /> {t('therapyPlans.signup.step2.title', 'Discount & Invitation')}
                            </h2>
                            <p className="text-sm text-stone-500">
                                {t('therapyPlans.signup.step2.desc', 'If you have an invitation code or a discount coupon, please enter it below. This is optional.')}
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-2">
                                    {t('therapyPlans.signup.step2.codeLabel', 'Invitation / Discount Code')}
                                </label>
                                <input
                                    type="text"
                                    value={discountCode}
                                    onChange={(e) => setDiscountCode(e.target.value)}
                                    placeholder={t('therapyPlans.signup.step2.codePlaceholder', 'Enter code (Optional)')}
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setStep(1)}>
                                    {t('common.back')}
                                </Button>
                                <Button onClick={() => setStep(3)}>
                                    {t('common.continue')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Final Check */}
                {step === 3 && (
                    <Card>
                        <CardContent className="p-6">
                            <h2 className="font-semibold text-stone-900 mb-5">{t('therapyPlans.signup.step3.title', 'Final Check')}</h2>

                            <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-xl mb-5">
                                <Avatar
                                    firstName={plan.therapist?.user?.firstName ?? ''}
                                    lastName={plan.therapist?.user?.lastName ?? ''}
                                    src={plan.therapist?.user?.avatarUrl}
                                    size="lg"
                                />
                                <div>
                                    <p className="font-medium text-stone-900">
                                        {plan.therapist?.user?.firstName} {plan.therapist?.user?.lastName}
                                    </p>
                                    <p className="text-sm text-stone-500">{plan.therapist?.locationCity}</p>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between py-2 border-b border-stone-100">
                                    <span className="flex items-center gap-2 text-stone-600">
                                        <Calendar className="h-4 w-4" /> {t('therapyPlans.detail.startTime')}
                                    </span>
                                    <span className="font-medium text-stone-900">{plan.startTime ? formatDate(plan.startTime) : ''}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-stone-100">
                                    <span className="flex items-center gap-2 text-stone-600">
                                        <Clock className="h-4 w-4" /> {t('therapyPlans.detail.time')}
                                    </span>
                                    <span className="font-medium text-stone-900">
                                        {plan.startTime ? formatTime(plan.startTime) : ''} – {plan.endTime ? formatTime(plan.endTime) : ''}
                                    </span>
                                </div>
                                {plan.location && (
                                    <div className="flex justify-between py-2 border-b border-stone-100">
                                        <span className="flex items-center gap-2 text-stone-600">
                                            <MapPin className="h-4 w-4" /> {t('therapyPlans.detail.location')}
                                        </span>
                                        <span className="font-medium text-stone-900">{plan.location}</span>
                                    </div>
                                )}
                                <div className="flex justify-between py-2 text-base pt-4">
                                    <span className="font-semibold text-stone-900">{t('therapyPlans.detail.total')}</span>
                                    <span className="font-bold text-teal-700">
                                        <PriceDisplay cnyAmount={Number(plan.price || 0)} className="font-bold text-teal-700" />
                                    </span>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setStep(2)}>
                                    {t('common.back')}
                                </Button>
                                <Button onClick={() => setStep(4)}>
                                    {t('therapyPlans.signup.step3.proceed', 'Proceed to Payment')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 4: Payment */}
                {step === 4 && (
                    <Card>
                        <CardContent className="p-6">
                            <h2 className="font-semibold text-stone-900 mb-5">{t('therapyPlans.signup.step4.title', 'Payment')}</h2>
                            <div className="flex justify-between text-sm mb-5 p-3 bg-stone-50 rounded-lg">
                                <span className="text-stone-600">{t('therapyPlans.detail.amountDue', 'Amount Due')}</span>
                                <span className="font-semibold text-stone-900">
                                    <PriceDisplay cnyAmount={Number(plan.price || 0)} className="font-semibold text-stone-900" />
                                </span>
                            </div>

                            <PaymentMethodSelector
                                alipayWechatEnabled={true}
                                selectedMethod={selectedMethod}
                                onSelect={setSelectedMethod}
                                isZh={i18n.language.startsWith('zh')}
                            />

                            {!signupResult ? (
                                <div className="flex justify-end mt-6">
                                    <Button
                                        loading={signupMutation.isPending}
                                        disabled={signupMutation.isPending || !selectedMethod}
                                        onClick={() => signupMutation.mutate()}
                                    >
                                        {t('therapyPlans.signup.step4.confirmAndPay', 'Confirm and Pay')}
                                    </Button>
                                </div>
                            ) : (
                                <div className="mt-4">
                                    {selectedMethod === 'alipay' && (
                                        <AlipayPaymentForm
                                            participantId={signupResult.participantId}
                                            onSuccess={handlePaymentSuccess}
                                            onError={handlePaymentError}
                                        />
                                    )}
                                    {selectedMethod === 'wechat' && (
                                        <WechatPaymentForm
                                            participantId={signupResult.participantId}
                                            onSuccess={handlePaymentSuccess}
                                            onError={handlePaymentError}
                                        />
                                    )}
                                    {selectedMethod === 'card' && <StripeUnavailable />}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};
