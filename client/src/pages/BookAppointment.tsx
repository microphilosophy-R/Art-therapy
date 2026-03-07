import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { ChevronLeft, Calendar, Clock, Video, MapPin, Zap } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import zhCnLocale from '@fullcalendar/core/locales/zh-cn';
import { useTranslation } from 'react-i18next';
import { getTherapist, getAvailableSlots } from '../api/therapists';
import { createAppointment } from '../api/appointments';
import { Button } from '../components/ui/Button';
import { PriceDisplay } from '../components/ui/PriceDisplay';
import { StandardPaymentWorkflow } from '../components/payments/StandardPaymentWorkflow';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { PageLoader } from '../components/ui/Spinner';
import { formatTime } from '../utils/formatters';
import type { TimeSlot } from '../types';
import type { PaymentMethod } from '../components/payments/PaymentMethodSelector';

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

  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [medium, setMedium] = useState<'VIDEO' | 'IN_PERSON'>('VIDEO');
  const [notes] = useState('');
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [, setBrowseExpanded] = useState(false);
  const [isWorkflowActive, setIsWorkflowActive] = useState(false);

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
      const clamped = Math.min(180, Math.max(60, therapist.sessionLength || 60));
      const nearest = DURATION_OPTIONS.reduce((prev, cur) =>
        Math.abs(cur - clamped) < Math.abs(prev - clamped) ? cur : prev,
      );
      setSelectedDuration(nearest);
    }
  }, [therapist]);

  // Main browse slots query
  const { data: slotsData, isLoading: loadingSlots, error: slotsError } = useQuery({
    queryKey: ['slots', therapistId, selectedDate, selectedDuration],
    queryFn: () => getAvailableSlots(therapistId!, selectedDate, selectedDuration),
    enabled: !!therapistId,
  });

  // Quick-pick slots query
  const { data: quickPickSlotsData, error: quickPickSlotsError } = useQuery({
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
  }, [quickPickSlotsData, quickPickSearchDate]);

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
    }
  });

  if (loadingTherapist) return <PageLoader />;
  if (!therapist) return null;

  const slots: TimeSlot[] = slotsData ?? [];
  const slotsApiError = (slotsError ?? quickPickSlotsError) as AxiosError<{ code?: string; message?: string }> | null;
  const consultPlanBlocked = slotsApiError?.response?.data?.code === 'CONSULT_PLAN_UNCONFIGURED';
  const consultPlanBlockedMessage =
    slotsApiError?.response?.data?.message ??
    t('booking.step1.consultPlanUnavailable');

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

  const workflowData = {
    title: t('common.planType.PERSONAL_CONSULT'),
    price: Number(therapist.sessionPrice),
    startTime: selectedSlot?.startTime || '',
    endTime: selectedSlot?.endTime,
    location: medium === 'IN_PERSON' ? therapist.locationCity : t('common.medium.VIDEO'),
    therapistName: `${therapist.user.firstName} ${therapist.user.lastName}`,
    therapistAvatar: therapist.user.avatarUrl,
    appointmentId: appointmentId || undefined,
  };

  const handleWorkflowComplete = async (method: PaymentMethod) => {
    if (!appointmentId) {
      const appt = await createMutation.mutateAsync();
      setAppointmentId(appt.id);
      return appt;
    }
    return { id: appointmentId };
  };

  if (isWorkflowActive) {
    return (
      <div className="bg-stone-50 min-h-screen py-12">
        <StandardPaymentWorkflow
          type="PERSONAL_CONSULT"
          data={workflowData}
          onTimeStep={() => (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
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
              ) : consultPlanBlocked ? (
                <div className="py-4 text-center text-amber-700 text-sm">
                  {consultPlanBlockedMessage}
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
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selectedSlot?.startTime === slot.startTime
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'border-stone-300 text-stone-700 hover:border-teal-400 bg-white'
                        }`}
                    >
                      {formatTime(slot.startTime)}
                    </button>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-stone-100">
                <h3 className="text-sm font-medium text-stone-700 mb-3">{t('booking.steps.format')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'VIDEO' as const, icon: Video, label: t('booking.step2.videoCall') },
                    { value: 'IN_PERSON' as const, icon: MapPin, label: t('booking.step2.inPerson') },
                  ].map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setMedium(value)}
                      className={`p-3 rounded-xl border-2 text-left transition-colors ${medium === value
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                    >
                      <Icon className={`h-4 w-4 mb-1 ${medium === value ? 'text-teal-600' : 'text-stone-400'}`} />
                      <p className="font-medium text-stone-900 text-xs">{label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          onComplete={handleWorkflowComplete}
          onCancel={() => setIsWorkflowActive(false)}
        />
      </div>
    );
  }

  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('booking.backToProfile')}
        </button>

        <h1 className="text-2xl font-bold text-stone-900 mb-1">{t('booking.title')}</h1>
        <p className="text-stone-500 text-sm mb-6">
          {t('booking.with', { name: therapist.user.firstName })} {therapist.user.lastName}
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-600" />
              {t('booking.step1.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Pick */}
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
                      {consultPlanBlocked
                        ? consultPlanBlockedMessage
                        : t('booking.step1.searchingQuickPick', 'Finding next available slot…')}
                    </span>
                    <DurationSelector />
                  </>
                )}
              </div>
            </div>

            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={i18n.language.startsWith('zh') ? zhCnLocale : undefined}
              headerToolbar={{ left: 'prev', center: 'title', right: 'next' }}
              height="auto"
              dateClick={(info) => {
                setSelectedDate(info.dateStr);
                setSelectedSlot(null);
                setBrowseExpanded(true);
              }}
              events={[{
                start: selectedDate,
                allDay: true,
                display: 'background',
                color: '#99f6e4',
              }]}
              validRange={{ start: todayStr() }}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
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
            ) : consultPlanBlocked ? (
              <div className="py-4 text-center text-amber-700 text-sm">
                {consultPlanBlockedMessage}
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
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selectedSlot?.startTime === slot.startTime
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'border-stone-300 text-stone-700 hover:border-teal-400 bg-white'
                      }`}
                  >
                    {formatTime(slot.startTime)}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end border-t border-stone-100 pt-4">
            <Button
              disabled={!selectedSlot || consultPlanBlocked}
              onClick={() => setIsWorkflowActive(true)}
            >
              {t('common.continue')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
