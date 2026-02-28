import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../../ui/Input';
import { DatePicker } from '../../ui/DatePicker';
import { useQuery } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import zhCnLocale from '@fullcalendar/core/locales/zh-cn';
import { PlanSchedule, type PlanEventDraft } from '../PlanSchedule';
import { getAppointments } from '../../../api/appointments';
import { listTherapyPlans } from '../../../api/therapyPlans';
import { useAuthStore } from '../../../store/authStore';
import type { TherapyPlanType, Appointment, TherapyPlan } from '../../../types';

export interface Step2Props {
    values: {
        startTime: string;
        endTime: string;
        type: TherapyPlanType;
        events: PlanEventDraft[];
        [key: string]: any;
    };
    errors: any;
    set: (key: any, val: any) => void;
    handleStartTimeChange: (val: string) => void;
    handleEndTimeChange: (val: string) => void;
    durationMinutes: string;
    handleDurationChange: (val: string) => void;
}

export const Step2Schedule = ({
    values,
    errors,
    set,
    handleStartTimeChange,
    handleEndTimeChange,
    durationMinutes,
    handleDurationChange,
}: Step2Props) => {
    const { t, i18n } = useTranslation();
    const [durationUnit, setDurationUnit] = useState<'min' | 'hm'>('hm');
    const { user } = useAuthStore();

    const { data: appointmentData } = useQuery({
        queryKey: ['appointments', { status: ['CONFIRMED'] }],
        queryFn: () => getAppointments({ status: ['CONFIRMED'] }),
        enabled: !!user?.id,
    });

    const { data: plansData } = useQuery({
        queryKey: ['therapy-plans', { status: 'PUBLISHED' }],
        queryFn: () => listTherapyPlans({ status: 'PUBLISHED' }),
        enabled: !!user?.id,
    });

    let calendarEvents: Array<any> = [];

    if (appointmentData?.data) {
        calendarEvents = calendarEvents.concat(
            appointmentData.data.map((app: Appointment) => ({
                id: `app-${app.id}`,
                title: t('therapyPlans.form.busyAppointment'),
                start: app.startTime,
                end: app.endTime,
                color: '#f43f5e', // rose-500
            }))
        );
    }

    if (plansData?.data) {
        calendarEvents = calendarEvents.concat(
            plansData.data.flatMap((plan: TherapyPlan) =>
                plan.events ? plan.events.map((ev: any) => ({
                    id: `plan-ev-${ev.id}`,
                    title: `${t('common.therapyPlans', 'Plan')}: ${plan.title}`,
                    start: ev.startTime,
                    end: ev.endTime || ev.startTime,
                    color: '#0d9488', // teal-600
                })) : []
            )
        );
    }

    // Add current draft event
    if (values.startTime) {
        const start = new Date(values.startTime);
        let end = values.endTime ? new Date(values.endTime) : null;
        if (!end && durationMinutes) {
            end = new Date(start.getTime() + parseInt(durationMinutes, 10) * 60000);
        }

        calendarEvents.push({
            id: 'current-draft',
            title: `[${t('common.planStatus.DRAFT', 'DRAFT')}] ${values.title || (i18n.language.startsWith('zh') ? '新计划' : 'New Plan')}`,
            start: values.startTime,
            end: end ? end.toISOString() : values.startTime,
            color: '#0891b2', // cyan-600
            className: 'fc-event-draft', // For potential dashed styling
            textColor: '#fff',
        });
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <DatePicker
                    label={t('therapyPlans.form.startTime')}
                    value={values.startTime}
                    onChange={(val) => handleStartTimeChange(val)}
                    error={errors.startTime}
                />
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-stone-700">
                            {t('therapyPlans.form.duration', 'Duration')}
                        </span>
                        <div className="flex rounded border border-stone-200 overflow-hidden text-xs leading-none">
                            <button
                                type="button"
                                onClick={() => setDurationUnit('min')}
                                className={`px-2 py-1 transition-colors ${durationUnit === 'min' ? 'bg-teal-600 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'}`}
                            >
                                {t('therapyPlans.form.durationUnitMin')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setDurationUnit('hm')}
                                className={`px-2 py-1 transition-colors border-l border-stone-200 ${durationUnit === 'hm' ? 'bg-teal-600 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'}`}
                            >
                                {t('therapyPlans.form.durationUnitHm')}
                            </button>
                        </div>
                    </div>

                    {durationUnit === 'min' ? (
                        <div className="flex items-center gap-1.5">
                            <input
                                type="number"
                                min={1}
                                placeholder={t('therapyPlans.form.durationPlaceholder', 'e.g. 60')}
                                value={durationMinutes}
                                onChange={(e) => handleDurationChange(e.target.value)}
                                className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                            <span className="text-stone-400 text-sm flex-shrink-0">{t('therapyPlans.form.durationUnitMin')}</span>
                        </div>
                    ) : (
                        (() => {
                            const total = parseInt(durationMinutes, 10);
                            const hasVal = !isNaN(total) && total > 0;
                            const dispH = hasVal ? Math.floor(total / 60) : '';
                            const dispM = hasVal ? total % 60 : '';
                            const inputCls = 'h-10 w-full rounded-lg border border-stone-300 bg-white px-2 text-sm text-stone-900 text-center placeholder:text-stone-400 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500';
                            return (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={dispH}
                                        onChange={(e) => {
                                            const h = Math.max(0, parseInt(e.target.value, 10) || 0);
                                            const m = hasVal ? total % 60 : 0;
                                            handleDurationChange(String(h * 60 + m));
                                        }}
                                        className={inputCls}
                                    />
                                    <span className="text-stone-400 text-sm flex-shrink-0">{t('therapyPlans.form.durationHour')}</span>
                                    <input
                                        type="number"
                                        min={0}
                                        max={59}
                                        placeholder="0"
                                        value={dispM}
                                        onChange={(e) => {
                                            const m = Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0));
                                            const h = hasVal ? Math.floor(total / 60) : 0;
                                            handleDurationChange(String(h * 60 + m));
                                        }}
                                        className={inputCls}
                                    />
                                    <span className="text-stone-400 text-sm flex-shrink-0">{t('therapyPlans.form.durationMinute')}</span>
                                </div>
                            );
                        })()
                    )}
                </div>
                <DatePicker
                    label={`${t('therapyPlans.form.endTime')} ${t('therapyPlans.form.endTimeOptional')}`}
                    value={values.endTime}
                    onChange={(val) => handleEndTimeChange(val)}
                    error={errors.endTime}
                />
            </div>

            <div className="border border-stone-200 rounded-lg p-4 bg-white shadow-sm mt-6">
                <h3 className="text-sm font-semibold text-stone-900 mb-4">{t('therapyPlans.form.scheduleVisualizer')}</h3>
                <p className="text-xs text-stone-500 mb-4">
                    {t('therapyPlans.form.scheduleVisualizerDesc')}
                </p>
                <div className="fc-container text-sm">
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        locale={i18n.language.startsWith('zh') ? zhCnLocale : undefined}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek',
                        }}
                        events={calendarEvents}
                        height={500}
                        slotMinTime="08:00:00"
                        slotMaxTime="22:00:00"
                        allDaySlot={false}
                    />
                </div>
            </div>

            {values.type === 'WELLNESS_RETREAT' && (
                <div className="border border-stone-200 rounded-lg p-4 bg-white shadow-sm">
                    <PlanSchedule
                        mode="edit"
                        drafts={values.events}
                        planType={values.type}
                        planStartTime={values.startTime}
                        onChange={(drafts) => set('events', drafts)}
                    />
                </div>
            )}
        </div>
    );
};
