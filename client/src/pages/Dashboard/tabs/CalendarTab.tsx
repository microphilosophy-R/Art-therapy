import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock } from 'lucide-react';
import { Spinner } from '../../../components/ui/Spinner';
import api from '../../../api/axios';

type EventType = 'appointment' | 'plan';

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: EventType;
  status?: string;
}

export const CalendarTab = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'appointments' | 'plans'>('all');

  const { data: events, isLoading, isError } = useQuery({
    queryKey: ['calendar-events', filter],
    queryFn: async () => {
      const res = await api.get(`/calendar/events?include=${filter === 'all' ? 'appointments,plans' : filter}`);
      return res.data;
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (isError) return (
    <div className="text-center py-12 text-rose-500">
      <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
      <p>{t('dashboard.calendar.errorLoading')}</p>
    </div>
  );

  const sortedEvents = (events || []).sort((a: CalendarEvent, b: CalendarEvent) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-800">{t('dashboard.calendar.title')}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded ${
              filter === 'all' ? 'bg-teal-100 text-teal-700' : 'bg-stone-100 text-stone-600'
            }`}
          >
            {t('dashboard.calendar.filterAll')}
          </button>
          <button
            onClick={() => setFilter('appointments')}
            className={`px-3 py-1 text-sm rounded ${
              filter === 'appointments' ? 'bg-teal-100 text-teal-700' : 'bg-stone-100 text-stone-600'
            }`}
          >
            {t('dashboard.calendar.filterAppointments')}
          </button>
          <button
            onClick={() => setFilter('plans')}
            className={`px-3 py-1 text-sm rounded ${
              filter === 'plans' ? 'bg-teal-100 text-teal-700' : 'bg-stone-100 text-stone-600'
            }`}
          >
            {t('dashboard.calendar.filterPlans')}
          </button>
        </div>
      </div>

      {sortedEvents.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>{t('dashboard.calendar.noEvents')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedEvents.map((event: CalendarEvent) => (
            <div
              key={event.id}
              className={`border rounded-lg p-4 ${
                event.type === 'appointment' ? 'border-blue-200 bg-blue-50' : 'border-teal-200 bg-teal-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      event.type === 'appointment' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'
                    }`}>
                      {t(`dashboard.calendar.eventTypes.${event.type}`)}
                    </span>
                    {event.status && (
                      <span className="text-xs text-stone-500">{event.status}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-stone-900">{event.title}</h3>
                  <div className="flex items-center gap-1 mt-2 text-sm text-stone-600">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(event.startTime).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
