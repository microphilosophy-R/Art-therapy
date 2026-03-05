import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import zhCnLocale from '@fullcalendar/core/locales/zh-cn';
import api from '../../../api/axios';
import { Spinner } from '../../../components/ui/Spinner';

type EventType = 'appointment' | 'plan';
type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type PlanStatus = 'PUBLISHED' | 'SIGN_UP_CLOSED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime?: string | null;
  type: EventType;
  status?: AppointmentStatus | PlanStatus;
  medium?: 'IN_PERSON' | 'VIDEO';
  planType?: string;
}

const APPOINTMENT_COLORS: Record<AppointmentStatus, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#0d9488',
  IN_PROGRESS: '#0d9488',
  COMPLETED: '#64748b',
  CANCELLED: '#e11d48',
};

const PLAN_COLORS: Record<PlanStatus, string> = {
  PUBLISHED: '#3b82f6',
  SIGN_UP_CLOSED: '#6366f1',
  IN_PROGRESS: '#8b5cf6',
  FINISHED: '#475569',
  CANCELLED: '#be123c',
};

const isOngoingStatus = (event: CalendarEvent): boolean => {
  if (event.type === 'appointment') {
    return event.status === 'CONFIRMED' || event.status === 'IN_PROGRESS';
  }
  return event.status === 'PUBLISHED' || event.status === 'SIGN_UP_CLOSED' || event.status === 'IN_PROGRESS';
};

const getDefaultRange = () => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const from = new Date(monthStart);
  from.setDate(from.getDate() - 30);
  const to = new Date(monthEnd);
  to.setDate(to.getDate() + 90);
  return { from: from.toISOString(), to: to.toISOString() };
};

const formatRange = (start: string, end?: string | null): string => {
  const startDate = new Date(start);
  if (!end) return startDate.toLocaleString();
  const endDate = new Date(end);
  return `${startDate.toLocaleString()} - ${endDate.toLocaleString()}`;
};

export const CalendarTab = () => {
  const { t, i18n } = useTranslation();
  const [range, setRange] = useState(getDefaultRange);

  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: ['calendar-events', range.from, range.to],
    queryFn: async () => {
      const res = await api.get('/calendar/events', {
        params: {
          include: 'appointments,plans',
          from: range.from,
          to: range.to,
        },
      });
      return res.data as CalendarEvent[];
    },
  });

  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      ),
    [events],
  );

  const ongoingEvents = useMemo(
    () => sortedEvents.filter((event) => isOngoingStatus(event)),
    [sortedEvents],
  );

  const calendarEvents = useMemo(
    () =>
      sortedEvents.map((event) => {
        const color =
          event.type === 'appointment'
            ? APPOINTMENT_COLORS[(event.status as AppointmentStatus) ?? 'PENDING']
            : PLAN_COLORS[(event.status as PlanStatus) ?? 'PUBLISHED'];

        const hintParts = [
          event.status ? t(`dashboard.calendar.status.${event.status}`, event.status) : '',
          event.type === 'appointment'
            ? event.medium
              ? t(`common.medium.${event.medium}`, event.medium)
              : ''
            : event.planType
              ? t(`common.planType.${event.planType}`, event.planType)
              : '',
        ].filter(Boolean);

        return {
          id: event.id,
          title: event.title,
          start: event.startTime,
          end: event.endTime || undefined,
          backgroundColor: color,
          borderColor: color,
          textColor: '#ffffff',
          extendedProps: {
            type: event.type,
            status: event.status,
            hint: hintParts.join(' · '),
          },
        };
      }),
    [sortedEvents, t],
  );

  const legendItems = [
    { key: 'CONFIRMED', color: APPOINTMENT_COLORS.CONFIRMED },
    { key: 'IN_PROGRESS', color: APPOINTMENT_COLORS.IN_PROGRESS },
    { key: 'PUBLISHED', color: PLAN_COLORS.PUBLISHED },
    { key: 'SIGN_UP_CLOSED', color: PLAN_COLORS.SIGN_UP_CLOSED },
    { key: 'FINISHED', color: PLAN_COLORS.FINISHED },
    { key: 'CANCELLED', color: '#be123c' },
  ];

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (isError) {
    return (
      <div className="text-center py-12 text-rose-500">
        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>{t('dashboard.calendar.errorLoading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-stone-800">{t('dashboard.calendar.title')}</h2>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-700">
          {t('dashboard.calendar.ongoingTitle', 'Ongoing Events')}
        </h3>
        {ongoingEvents.length === 0 ? (
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-6 text-sm text-stone-500">
            {t('dashboard.calendar.noOngoing', 'No ongoing events right now.')}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {ongoingEvents.map((event) => (
              <div
                key={event.id}
                className={`min-w-[280px] rounded-lg border p-4 ${
                  event.type === 'appointment'
                    ? 'border-teal-200 bg-teal-50'
                    : 'border-indigo-200 bg-indigo-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-white/80 text-stone-700">
                    {t(`dashboard.calendar.eventTypes.${event.type}`)}
                  </span>
                  {event.status && (
                    <span className="text-xs text-stone-600">
                      {t(`dashboard.calendar.status.${event.status}`, event.status)}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-stone-900">{event.title}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-stone-600">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatRange(event.startTime, event.endTime)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-700">
          {t('dashboard.calendar.graphicTitle', 'Graphic Calendar')}
        </h3>
        <div className="flex items-center gap-3 flex-wrap text-xs text-stone-500">
          <span className="font-medium text-stone-600">
            {t('dashboard.calendar.legendTitle', 'Legend')}:
          </span>
          {legendItems.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {t(`dashboard.calendar.status.${item.key}`, item.key)}
            </span>
          ))}
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="dayGridMonth"
            locale={i18n.language.startsWith('zh') ? zhCnLocale : undefined}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek',
            }}
            events={calendarEvents}
            nowIndicator
            height="auto"
            datesSet={(arg) => {
              const next = {
                from: new Date(arg.start).toISOString(),
                to: new Date(arg.end).toISOString(),
              };
              setRange((prev) =>
                prev.from === next.from && prev.to === next.to ? prev : next,
              );
            }}
            eventContent={(arg) => (
              <div className="overflow-hidden px-1 py-0.5 text-xs leading-tight">
                <div className="font-semibold truncate">{arg.event.title}</div>
                {arg.event.extendedProps.hint && (
                  <div className="opacity-90 truncate">{arg.event.extendedProps.hint}</div>
                )}
              </div>
            )}
          />
        </div>
      </section>
    </div>
  );
};
