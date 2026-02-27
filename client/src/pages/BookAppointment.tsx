import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Calendar, Clock, Video, MapPin, Info, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import zhCnLocale from '@fullcalendar/core/locales/zh-cn';
import { useTranslation } from 'react-i18next';
import { getTherapist, getAvailableSlots } from '../api/therapists';
import { createAppointment } from '../api/appointments';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { PageLoader } from '../components/ui/Spinner';
import { PaymentMethodSelector, type PaymentMethod } from '../components/payments/PaymentMethodSelector';
import { StripeUnavailable } from '../components/payments/StripeUnavailable';
import { AlipayPaymentForm } from '../components/payments/AlipayPaymentForm';
import { WechatPaymentForm } from '../components/payments/WechatPaymentForm';
import { formatDate, formatTime } from '../utils/formatters';
import type { TimeSlot } from '../types';
import { PriceDisplay } from '../components/ui/PriceDisplay';

type Step = 1 | 2 | 3 | 4;

const DURATION_OPTIONS = [60, 90, 120, 150, 180] as const;
const durationLabel = (min: number) => {
  if (min % 60 === 0) return `${min / 60}h`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const advanceDate = (dateStr: string, days = 1) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const BookAppointment = () => {
  const { t, i18n } = useTranslation();
  const { therapistId } = useParams<{ therapistId: string }>();
  const navigate = useNavigate();

  const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED !== 'false';
  const alipayWechatEnabled = import.meta.env.VITE_ALIPAY_WECHAT_ENABLED === 'true';
  const isZh = i18n.language.startsWith('zh');

  const [step, setStep] = useState<Step>(1);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [medium, setMedium] = useState<'VIDEO' | 'IN_PERSON'>('VIDEO');
  const [notes, setNotes] = useState('');
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(isZh ? 'alipay' : null);
  const [browseExpanded, setBrowseExpanded] = useState(false);

  // Duration state — initialised after therapist loads
  const [selectedDuration, setSelectedDuration] = useState<number>(60);

  // Quick-pick: search forward from today up to 7 days
  const [quickPickSearchDate, setQuickPickSearchDate] = useState<string>(todayStr());
  const [quickPickSlot, setQuickPickSlot] = useState<TimeSlot | null>(null);
  const [quickPickDate, setQuickPickDate] = useState<string | null>(null);

  const { data: therapist, isLoading: loadingTherapist } = useQuery({
    queryKey: ['therapist', therapistId],
    queryFn: () => getTherapist(therapistId!),
    enabled: !!therapistId,
  });

  // Initialise duration from therapist.sessionLength
  useEffect(() => {
    if (therapist) {
      const clamped = Math.min(180, Math.max(60, therapist.sessionLength));
      const nearest = DURATION_OPTIONS.reduce((prev, cur) =>
        Math.abs(cur - clamped) < Math.abs(prev - clamped) ? cur : prev,
      );
      setSelectedDuration(nearest);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [therapist?.id]);

  // Main browse slots query
  const { data: slotsData, isLoading: loadingSlots } = useQuery({
    queryKey: ['slots', therapistId, selectedDate, selectedDuration],
    queryFn: () => getAvailableSlots(therapistId!, selectedDate, selectedDuration),
    enabled: !!therapistId,
  });

  // Quick-pick slots query
  const { data: quickPickSlotsData } = useQuery({
    queryKey: ['slots-quick', therapistId, quickPickSearchDate, selectedDuration],
    queryFn: () => getAvailableSlots(therapistId!, quickPickSearchDate, selectedDuration),
    enabled: !!therapistId && !quickPickSlot,
  });

  // Advance quick-pick date if no slots found (up to 7 days out)
  useEffect(() => {
    if (!quickPickSlotsData) return;
    if (quickPickSlotsData.length > 0) {
      setQuickPickSlot(quickPickSlotsData[0]);
      setQuickPickDate(quickPickSearchDate);
    } else {
      const diff =
        (new Date(quickPickSearchDate).getTime() - new Date(todayStr()).getTime()) /
        86400000;
      if (diff < 6) {
        setQuickPickSearchDate(advanceDate(quickPickSearchDate));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickPickSlotsData]);

  // Reset quick pick when duration changes
  useEffect(() => {
    setQuickPickSlot(null);
    setQuickPickDate(null);
    setQuickPickSearchDate(todayStr());
  }, [selectedDuration]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot || !therapistId) throw new Error('Missing data');
      const appt = await createAppointment({
        therapistId,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        medium,
        clientNotes: notes || undefined,
      });
      return appt;
    },
    onSuccess: (appt) => {
      if (!paymentsEnabled) {
        navigate(`/booking/confirmation?appointmentId=${appt.id}&paymentDisabled=true`);
        return;
      }
      setAppointmentId(appt.id);
      setStep(4);
    },
  });

  if (loadingTherapist) return <PageLoader />;
  if (!therapist) return null;

  const slots: TimeSlot[] = slotsData ?? [];

  const handlePaymentSuccess = () => {
    navigate(`/booking/confirmation?appointmentId=${appointmentId}&redirect_status=succeeded`);
  };

  const handlePaymentError = (msg: string) => {
    console.error('Payment error:', msg);
  };

  const STEPS = paymentsEnabled
    ? [
        { n: 1, label: t('booking.steps.dateTime') },
        { n: 2, label: t('booking.steps.format') },
        { n: 3, label: t('booking.steps.review') },
        { n: 4, label: t('booking.steps.pay') },
      ]
    : [
        { n: 1, label: t('booking.steps.dateTime') },
        { n: 2, label: t('booking.steps.format') },
        { n: 3, label: t('booking.steps.review') },
      ];

  // Duration selector — reused in Section A and B
  const DurationSelector = ({ className = '' }: { className?: string }) => (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-stone-500">{t('booking.step1.duration', 'Duration')}</span>
      <select
        value={selectedDuration}
        onChange={(e) => {
          setSelectedDuration(Number(e.target.value));
          setSelectedSlot(null);
        }}
        className="rounded-md border border-stone-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
      >
        {DURATION_OPTIONS.map((d) => (
          <option key={d} value={d}>{durationLabel(d)}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => (step === 1 ? navigate(-1) : setStep((s) => (s - 1) as Step))}
          className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          {step === 1 ? t('booking.backToProfile') : t('common.back')}
        </button>

        <h1 className="text-2xl font-bold text-stone-900 mb-1">{t('booking.title')}</h1>
        <p className="text-stone-500 text-sm mb-6">
          {t('booking.with', { name: therapist.user.firstName })} {therapist.user.lastName}
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              <div className="flex flex-col items-center">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step === s.n
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
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-colors ${
                    step > s.n ? 'bg-teal-300' : 'bg-stone-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Step 1 — Date & Time ── */}
        {step === 1 && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <h2 className="font-semibold text-stone-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-600" /> {t('booking.step1.title')}
              </h2>

              {/* ── Section A: Quick Pick ── */}
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Zap className="h-4 w-4 text-teal-600 flex-shrink-0" />
                  {quickPickSlot && quickPickDate ? (
                    <>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-stone-800">
                          {new Date(quickPickDate + 'T12:00:00').toLocaleDateString(undefined, {
                            weekday: 'short', month: 'short', day: 'numeric',
                          })}{' '}
                          {t('booking.step1.at', 'at')}{' '}
                          {formatTime(quickPickSlot.startTime)}
                        </span>
                      </div>
                      <DurationSelector />
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedSlot(quickPickSlot);
                          setSelectedDate(quickPickDate);
                        }}
                      >
                        {t('booking.step1.bookThis', 'Book this →')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-stone-500 flex-1">
                        {t('booking.step1.searchingQuickPick', 'Finding next available slot…')}
                      </span>
                      <DurationSelector />
                    </>
                  )}
                </div>
              </div>

              {/* ── Section B: Browse Manually (collapsible) ── */}
              <div>
                <button
                  type="button"
                  onClick={() => setBrowseExpanded((v) => !v)}
                  className="flex items-center gap-1 text-sm text-teal-700 font-medium hover:text-teal-900"
                >
                  {browseExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {t('booking.step1.chooseDifferent', 'Choose a different time')}
                </button>

                {browseExpanded && (
                  <div className="mt-4 space-y-4">
                    <FullCalendar
                      plugins={[dayGridPlugin, interactionPlugin]}
                      initialView="dayGridMonth"
                      locale={i18n.language === 'zh' ? zhCnLocale : undefined}
                      headerToolbar={{ left: 'prev', center: 'title', right: 'next' }}
                      height="auto"
                      dateClick={(info) => {
                        setSelectedDate(info.dateStr);
                        setSelectedSlot(null);
                      }}
                      events={[{
                        start: selectedDate,
                        allDay: true,
                        display: 'background',
                        color: '#99f6e4',
                      }]}
                      validRange={{ start: todayStr() }}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3">
                      <p className="text-sm font-semibold text-stone-700">
                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, {
                          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                      <DurationSelector />
                    </div>

                    {loadingSlots ? (
                      <div className="py-4 text-center text-stone-400 text-sm">
                        {t('booking.step1.loadingSlots')}
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="py-4 text-center text-stone-400 text-sm">
                        {t('booking.step1.noSlots')}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {slots.map((slot) => (
                          <button
                            key={slot.startTime}
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                              selectedSlot?.startTime === slot.startTime
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'border-stone-300 text-stone-700 hover:border-teal-400 bg-white'
                            }`}
                          >
                            {formatTime(slot.startTime)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Section C: Appointment Preview (shown after slot selected) ── */}
              {selectedSlot && (
                <div className="border-t border-stone-100 pt-4">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
                    {t('booking.step1.preview', 'Appointment Preview')}
                  </p>
                  <FullCalendar
                    plugins={[timeGridPlugin]}
                    initialView="timeGridDay"
                    locale={i18n.language === 'zh' ? zhCnLocale : undefined}
                    initialDate={selectedSlot.startTime}
                    headerToolbar={false}
                    height={300}
                    allDaySlot={false}
                    slotMinTime="07:00:00"
                    slotMaxTime="22:00:00"
                    events={[
                      {
                        title: t('booking.step1.yourAppointment', 'Your appointment'),
                        start: selectedSlot.startTime,
                        end: selectedSlot.endTime,
                        color: '#0d9488',
                      },
                    ]}
                    editable={false}
                    selectable={false}
                  />
                </div>
              )}

              <div className="flex justify-end">
                <Button disabled={!selectedSlot} onClick={() => setStep(2)}>
                  {t('common.continue')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2 — Format ── */}
        {step === 2 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-stone-900 mb-4">{t('booking.step2.title')}</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { value: 'VIDEO' as const, icon: Video, label: t('booking.step2.videoCall'), desc: t('booking.step2.videoDesc') },
                  { value: 'IN_PERSON' as const, icon: MapPin, label: t('booking.step2.inPerson'), desc: t('booking.step2.inPersonAt', { city: therapist.locationCity }) },
                ].map(({ value, icon: Icon, label, desc }) => (
                  <button
                    key={value}
                    onClick={() => setMedium(value)}
                    className={`p-4 rounded-xl border-2 text-left transition-colors ${
                      medium === value
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mb-2 ${medium === value ? 'text-teal-600' : 'text-stone-400'}`} />
                    <p className="font-medium text-stone-900 text-sm">{label}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t('booking.step2.notesLabel')} <span className="text-stone-400">({t('booking.step2.notesOptional')})</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('booking.step2.notesPlaceholder')}
                  rows={3}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={() => setStep(3)}>{t('common.continue')}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3 — Review ── */}
        {step === 3 && selectedSlot && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-stone-900 mb-5">{t('booking.step3.title')}</h2>

              <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-xl mb-5">
                <Avatar
                  firstName={therapist.user.firstName}
                  lastName={therapist.user.lastName}
                  src={therapist.user.avatarUrl}
                  size="lg"
                />
                <div>
                  <p className="font-medium text-stone-900">
                    {therapist.user.firstName} {therapist.user.lastName}
                  </p>
                  <p className="text-sm text-stone-500">{therapist.locationCity}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="flex items-center gap-2 text-stone-600">
                    <Calendar className="h-4 w-4" /> {t('booking.step3.date')}
                  </span>
                  <span className="font-medium text-stone-900">{formatDate(selectedSlot.startTime)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="flex items-center gap-2 text-stone-600">
                    <Clock className="h-4 w-4" /> {t('booking.step3.time')}
                  </span>
                  <span className="font-medium text-stone-900">
                    {formatTime(selectedSlot.startTime)} – {formatTime(selectedSlot.endTime)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-600">{t('booking.step3.format')}</span>
                  <span className="font-medium text-stone-900">
                    {medium === 'VIDEO' ? t('booking.step3.videoCall') : t('booking.step3.inPerson')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-600">{t('booking.step3.duration')}</span>
                  <span className="font-medium text-stone-900">{selectedDuration} min</span>
                </div>
                <div className="flex justify-between py-2 text-base">
                  <span className="font-semibold text-stone-900">{t('booking.step3.total')}</span>
                  <span className="font-bold text-teal-700">
                    <PriceDisplay cnyAmount={therapist.sessionPrice} className="font-bold text-teal-700" />
                  </span>
                </div>
              </div>

              {therapist.refundPolicy && (
                <div className="mt-4 flex gap-2 p-3 rounded-lg bg-blue-50 text-xs text-blue-700">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{therapist.refundPolicy.policyDescription}</span>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => createMutation.mutate()}
                  loading={createMutation.isPending}
                >
                  {paymentsEnabled
                    ? t('booking.step3.proceedToPayment')
                    : t('booking.step3.confirmBooking', 'Confirm Booking')}
                </Button>
              </div>
              {createMutation.isError && (
                <p className="text-sm text-rose-600 mt-2 text-right">
                  {(createMutation.error as Error).message}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Step 4 — Payment ── */}
        {step === 4 && appointmentId && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-stone-900 mb-5">{t('booking.step4.title')}</h2>
              <div className="flex justify-between text-sm mb-5 p-3 bg-stone-50 rounded-lg">
                <span className="text-stone-600">{t('booking.step4.amountDue')}</span>
                <span className="font-semibold text-stone-900">
                  <PriceDisplay cnyAmount={therapist.sessionPrice} className="font-semibold text-stone-900" />
                </span>
              </div>
              <PaymentMethodSelector
                alipayWechatEnabled={alipayWechatEnabled}
                selectedMethod={selectedMethod}
                onSelect={setSelectedMethod}
                isZh={isZh}
              />
              {selectedMethod === 'alipay' && alipayWechatEnabled && (
                <AlipayPaymentForm
                  appointmentId={appointmentId}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              )}
              {selectedMethod === 'wechat' && alipayWechatEnabled && (
                <WechatPaymentForm
                  appointmentId={appointmentId}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              )}
              {selectedMethod === 'card' && <StripeUnavailable />}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
