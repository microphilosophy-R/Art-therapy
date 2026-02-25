import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Calendar, Clock, Video, MapPin, Info } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useTranslation } from 'react-i18next';
import { getTherapist, getAvailableSlots } from '../api/therapists';
import { createAppointment } from '../api/appointments';
import { createPaymentIntent } from '../api/payments';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { PageLoader } from '../components/ui/Spinner';
import { PaymentElementWrapper } from '../components/payments/PaymentElementWrapper';
import { formatDate, formatTime, formatPrice } from '../utils/formatters';
import type { TimeSlot } from '../types';

type Step = 1 | 2 | 3 | 4;

export const BookAppointment = () => {
  const { t } = useTranslation();
  const { therapistId } = useParams<{ therapistId: string }>();
  const navigate = useNavigate();

  const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED !== 'false';

  const [step, setStep] = useState<Step>(1);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [medium, setMedium] = useState<'VIDEO' | 'IN_PERSON'>('VIDEO');
  const [notes, setNotes] = useState('');
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const { data: therapist, isLoading: loadingTherapist } = useQuery({
    queryKey: ['therapist', therapistId],
    queryFn: () => getTherapist(therapistId!),
    enabled: !!therapistId,
  });

  const { data: slotsData, isLoading: loadingSlots } = useQuery({
    queryKey: ['slots', therapistId, selectedDate],
    queryFn: () => getAvailableSlots(therapistId!, selectedDate),
    enabled: !!therapistId,
  });

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
      if (!paymentsEnabled) return { appt, intent: null };
      const intent = await createPaymentIntent(appt.id);
      return { appt, intent };
    },
    onSuccess: ({ appt, intent }) => {
      if (!paymentsEnabled) {
        navigate(`/booking/confirmation?appointmentId=${appt.id}&paymentDisabled=true`);
        return;
      }
      setAppointmentId(appt.id);
      setClientSecret(intent!.clientSecret);
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

        {/* Step 1 — Date & Time */}
        {step === 1 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-600" /> {t('booking.step1.title')}
              </h2>

              <div className="mb-5">
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
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
                  validRange={{ start: new Date().toISOString().slice(0, 10) }}
                />
              </div>

              <div className="border-t border-stone-100 pt-4">
                <p className="text-sm font-semibold text-stone-700 mb-3">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                {loadingSlots ? (
                  <div className="py-6 text-center text-stone-400 text-sm">{t('booking.step1.loadingSlots')}</div>
                ) : slots.length === 0 ? (
                  <div className="py-6 text-center text-stone-400 text-sm">
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

              <div className="mt-6 flex justify-end">
                <Button disabled={!selectedSlot} onClick={() => setStep(2)}>
                  {t('common.continue')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2 — Format */}
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

        {/* Step 3 — Review */}
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
                  <span className="font-medium text-stone-900">{therapist.sessionLength} min</span>
                </div>
                <div className="flex justify-between py-2 text-base">
                  <span className="font-semibold text-stone-900">{t('booking.step3.total')}</span>
                  <span className="font-bold text-teal-700">{formatPrice(therapist.sessionPrice)}</span>
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

        {/* Step 4 — Payment */}
        {step === 4 && clientSecret && appointmentId && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-stone-900 mb-5">{t('booking.step4.title')}</h2>
              <div className="flex justify-between text-sm mb-5 p-3 bg-stone-50 rounded-lg">
                <span className="text-stone-600">{t('booking.step4.amountDue')}</span>
                <span className="font-semibold text-stone-900">{formatPrice(therapist.sessionPrice)}</span>
              </div>
              <PaymentElementWrapper
                clientSecret={clientSecret}
                appointmentId={appointmentId}
                amount={therapist.sessionPrice}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
