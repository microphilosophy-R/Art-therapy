import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, DollarSign, Users, ExternalLink, AlertCircle, FileText, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import zhCnLocale from '@fullcalendar/core/locales/zh-cn';
import { getAppointments, updateAppointmentStatus } from '../../api/appointments';
import { getConnectStatus, startConnectOnboarding } from '../../api/payments';
import { listSentForms, type ClientForm } from '../../api/forms';
import { getUnreadCount } from '../../api/messages';
import { AppointmentCard } from '../../components/appointments/AppointmentCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import { TherapistPlansTab } from './tabs/TherapistPlansTab';
import { MessagesTab } from './tabs/MessagesTab';
import type { AppointmentStatus } from '../../types';

type Tab = 'pending' | 'upcoming' | 'past' | 'forms' | 'calendar' | 'plans' | 'messages';

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  PENDING: '#fbbf24',
  CONFIRMED: '#14b8a6',
  CANCELLED: '#f87171',
  COMPLETED: '#94a3b8',
};

export const TherapistDashboard = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('plans');

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', 'therapist', tab],
    queryFn: () =>
      getAppointments({
        status:
          tab === 'pending'
            ? ['PENDING']
            : tab === 'upcoming'
              ? ['CONFIRMED']
              : ['COMPLETED', 'CANCELLED'],
      }),
    enabled: tab !== 'calendar',
  });

  // Independent count queries — always enabled so badge numbers stay correct
  // regardless of which tab is active.
  const { data: pendingCountData } = useQuery({
    queryKey: ['appointments', 'therapist', 'count', 'pending'],
    queryFn: () => getAppointments({ status: ['PENDING'], limit: 1 }),
  });
  const { data: upcomingCountData } = useQuery({
    queryKey: ['appointments', 'therapist', 'count', 'upcoming'],
    queryFn: () => getAppointments({ status: ['CONFIRMED'], limit: 1 }),
  });
  const pendingCount = pendingCountData?.total ?? 0;
  const upcomingCount = upcomingCountData?.total ?? 0;

  const { data: connectStatus, isLoading: loadingConnect } = useQuery({
    queryKey: ['connect-status'],
    queryFn: getConnectStatus,
  });

  const onboardMutation = useMutation({
    mutationFn: startConnectOnboarding,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => updateAppointmentStatus(id, 'CONFIRMED'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const { data: formsData } = useQuery({
    queryKey: ['sent-forms'],
    queryFn: () => listSentForms(1),
  });

  const { data: calendarData } = useQuery({
    queryKey: ['appointments', 'therapist', 'calendar-all'],
    queryFn: () => getAppointments({ limit: 100 }),
    enabled: tab === 'calendar',
  });

  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count ?? 0;

  const appointments = data?.data ?? [];

  const calendarEvents = (calendarData?.data ?? []).map((appt) => ({
    id: appt.id,
    title: appt.client
      ? `${appt.client.firstName} ${appt.client.lastName}`
      : 'Client',
    start: appt.startTime,
    end: appt.endTime,
    backgroundColor: STATUS_COLORS[appt.status],
    borderColor: STATUS_COLORS[appt.status],
    extendedProps: { status: appt.status, medium: appt.medium },
  }));

  const calendarLegendLabels: Record<AppointmentStatus, string> = {
    PENDING: t('dashboard.therapist.calendarLegend.pending'),
    CONFIRMED: t('dashboard.therapist.calendarLegend.confirmed'),
    CANCELLED: t('dashboard.therapist.calendarLegend.cancelled'),
    COMPLETED: t('dashboard.therapist.calendarLegend.completed'),
  };

  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900">
            {t('dashboard.therapist.welcome', { name: user?.firstName })}
          </h1>
          <p className="text-stone-500 mt-1">{t('dashboard.therapist.subtitle')}</p>
        </div>

        {/* Stripe Connect banner */}
        {!loadingConnect && connectStatus?.status !== 'ACTIVE' && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                {t('dashboard.therapist.stripeTitle')}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {t('dashboard.therapist.stripeDesc')}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => onboardMutation.mutate()}
              loading={onboardMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t('dashboard.therapist.setupPayouts')}
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Calendar, label: t('dashboard.therapist.sessionsThisMonth'), value: '—', color: 'text-teal-600 bg-teal-50' },
            { icon: DollarSign, label: t('dashboard.therapist.earningsThisMonth'), value: '—', color: 'text-green-600 bg-green-50' },
            { icon: Users, label: t('dashboard.therapist.activeClients'), value: '—', color: 'text-blue-600 bg-blue-50' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-stone-200 p-5 flex items-center gap-4">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{value}</p>
                <p className="text-xs text-stone-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Appointments */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 flex-wrap gap-3">
            <div className="flex gap-1 flex-wrap">
              {(['plans', 'pending', 'upcoming', 'past', 'forms', 'calendar', 'messages'] as Tab[]).map((tabKey) => (
                <button
                  key={tabKey}
                  onClick={() => setTab(tabKey)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${tab === tabKey
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-stone-500 hover:bg-stone-50'
                    }`}
                >
                  {tabKey === 'forms'
                    ? t('dashboard.therapist.forms')
                    : tabKey === 'calendar'
                      ? t('dashboard.therapist.calendar')
                      : tabKey === 'pending'
                        ? t('dashboard.therapist.pending')
                        : tabKey === 'upcoming'
                          ? t('dashboard.therapist.upcoming')
                          : tabKey === 'plans'
                            ? t('dashboard.therapist.plans')
                            : tabKey === 'messages'
                              ? t('dashboard.therapist.messages')
                              : t('dashboard.therapist.past')}
                  {tabKey === 'pending' && pendingCount > 0 ? (
                    <Badge variant="warning" className="ml-1.5 text-xs">
                      {pendingCount}
                    </Badge>
                  ) : null}
                  {tabKey === 'upcoming' && upcomingCount > 0 ? (
                    <Badge variant="info" className="ml-1.5 text-xs">
                      {upcomingCount}
                    </Badge>
                  ) : null}
                  {tabKey === 'forms' && (formsData?.total ?? 0) > 0 ? (
                    <Badge variant="info" className="ml-1.5 text-xs">
                      {formsData!.total}
                    </Badge>
                  ) : null}
                  {tabKey === 'messages' && unreadCount > 0 ? (
                    <Badge variant="danger" className="ml-1.5 text-xs">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className={tab === 'calendar' ? 'p-4' : 'p-6'}>
            {tab === 'plans' ? (
              <TherapistPlansTab />
            ) : tab === 'messages' ? (
              <MessagesTab />
            ) : tab === 'calendar' ? (
              <div>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  {(Object.entries(STATUS_COLORS) as [AppointmentStatus, string][]).map(([status, color]) => (
                    <span key={status} className="flex items-center gap-1.5 text-xs text-stone-500">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                      {calendarLegendLabels[status]}
                    </span>
                  ))}
                </div>
                <FullCalendar
                  plugins={[timeGridPlugin, dayGridPlugin]}
                  initialView="timeGridWeek"
                  locale={i18n.language.startsWith('zh') ? zhCnLocale : undefined}
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek',
                  }}
                  events={calendarEvents}
                  height="auto"
                  nowIndicator
                  slotMinTime="07:00:00"
                  slotMaxTime="21:00:00"
                  eventContent={(arg) => (
                    <div className="overflow-hidden px-1 text-xs leading-tight">
                      <div className="font-semibold truncate">{arg.event.title}</div>
                      <div className="opacity-80">{arg.event.extendedProps.medium === 'VIDEO' ? 'Video' : 'In person'}</div>
                    </div>
                  )}
                />
              </div>
            ) : tab === 'forms' ? (
              <div>
                <div className="flex justify-end mb-4">
                  <Link to="/forms/new">
                    <Button size="sm"><Plus className="h-4 w-4" /> {t('dashboard.therapist.newForm')}</Button>
                  </Link>
                </div>
                {(formsData?.data ?? []).length === 0 ? (
                  <div className="text-center py-12 text-stone-400">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>{t('dashboard.therapist.noForms')}</p>
                    <Link to="/forms/new" className="mt-3 inline-block text-sm text-teal-600 hover:underline">{t('dashboard.therapist.createFirstForm')}</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(formsData?.data ?? []).map((form: ClientForm) => {
                      const clientName = `${form.recipient?.firstName ?? ''} ${form.recipient?.lastName ?? ''}`.trim();
                      return (
                        <div key={form.id} className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 hover:bg-stone-50">
                          <div>
                            <p className="text-sm font-medium text-stone-800">{form.title}</p>
                            <p className="text-xs text-stone-400 mt-0.5">
                              {t('dashboard.therapist.formTo', { name: clientName })} &bull; {form.status}
                            </p>
                          </div>
                          <Link to={`/forms/${form.id}/responses`}>
                            <Button size="sm" variant="outline">View</Button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : isLoading ? (
              <PageLoader />
            ) : appointments.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>{t('dashboard.therapist.noAppointments', { tab })}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appt) => (
                  <div key={appt.id}>
                    <AppointmentCard
                      appointment={appt}
                      perspective="therapist"
                    />
                    {tab === 'pending' && appt.status === 'PENDING' && (
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => confirmMutation.mutate(appt.id)}
                          loading={confirmMutation.isPending}
                        >
                          {t('dashboard.therapist.confirmSession')}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
