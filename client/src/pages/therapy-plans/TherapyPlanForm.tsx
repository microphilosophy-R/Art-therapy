import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import type { TherapyPlan, TherapyPlanType, ArtSalonSubType, SessionMedium } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { PosterSelector, type PosterValue } from '../../components/therapyPlans/PosterSelector';
import {
  PlanSchedule,
  eventsToFormDrafts,
  type PlanEventDraft,
} from '../../components/therapyPlans/PlanSchedule';

export interface TherapyPlanFormValues {
  type: TherapyPlanType;
  title: string;
  slogan: string;
  introduction: string;
  startTime: string;
  endTime: string;
  location: string;
  maxParticipants: string;
  price: string;
  contactInfo: string;
  artSalonSubType: ArtSalonSubType | '';
  sessionMedium: SessionMedium | '';
  poster: PosterValue;
  events: PlanEventDraft[];
}

const defaultValues: TherapyPlanFormValues = {
  type: 'PERSONAL_CONSULT',
  title: '',
  slogan: '',
  introduction: '',
  startTime: '',
  endTime: '',
  location: '',
  maxParticipants: '',
  price: '',
  contactInfo: '',
  artSalonSubType: '',
  sessionMedium: '',
  poster: { type: 'default', id: 1 },
  events: [],
};

const toDatetimeLocal = (iso?: string | null): string => {
  if (!iso) return '';
  return iso.slice(0, 16); // "YYYY-MM-DDTHH:MM"
};

export const planToFormValues = (plan: TherapyPlan): TherapyPlanFormValues => ({
  type: plan.type,
  title: plan.title,
  slogan: plan.slogan || '',
  introduction: plan.introduction,
  startTime: toDatetimeLocal(plan.startTime),
  endTime: toDatetimeLocal(plan.endTime),
  location: plan.location,
  maxParticipants: plan.maxParticipants != null ? String(plan.maxParticipants) : '',
  price: plan.price != null ? String(plan.price) : '',
  contactInfo: plan.contactInfo,
  artSalonSubType: plan.artSalonSubType ?? '',
  sessionMedium: plan.sessionMedium ?? '',
  poster: plan.posterUrl
    ? { type: 'custom', url: plan.posterUrl }
    : { type: 'default', id: plan.defaultPosterId ?? 1 },
  events: plan.events ? eventsToFormDrafts(plan.events) : [],
});

interface TherapyPlanFormProps {
  initialValues?: Partial<TherapyPlanFormValues>;
  onSubmit: (values: TherapyPlanFormValues, posterFile: File | null) => Promise<void>;
  submitLabel: string;
  isLoading?: boolean;
  error?: string | null;
  /** If provided, shown in an info banner above the form */
  rejectionReason?: string | null;
  /** Optional action rendered to the left of the submit button */
  secondaryAction?: React.ReactNode;
}

export const TherapyPlanForm = ({
  initialValues,
  onSubmit,
  submitLabel,
  isLoading,
  error,
  rejectionReason,
  secondaryAction,
}: TherapyPlanFormProps) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<TherapyPlanFormValues>({
    ...defaultValues,
    ...initialValues,
  });
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof TherapyPlanFormValues, string>>>({});
  const [durationMinutes, setDurationMinutes] = useState<string>(() => {
    const s = initialValues?.startTime ?? '';
    const e = initialValues?.endTime ?? '';
    if (s && e) {
      const diff = Math.round((new Date(e).getTime() - new Date(s).getTime()) / 60000);
      if (diff > 0) return String(diff);
    }
    return '';
  });
  const [durationUnit, setDurationUnit] = useState<'min' | 'hm'>('hm');

  const set = <K extends keyof TherapyPlanFormValues>(key: K, val: TherapyPlanFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const toLocalInput = (d: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleStartTimeChange = (val: string) => {
    set('startTime', val);
    if (val && durationMinutes) {
      const mins = parseInt(durationMinutes, 10);
      if (!isNaN(mins) && mins > 0) {
        set('endTime', toLocalInput(new Date(new Date(val).getTime() + mins * 60000)));
      }
    } else if (val && values.endTime) {
      const diff = Math.round((new Date(values.endTime).getTime() - new Date(val).getTime()) / 60000);
      if (diff > 0) setDurationMinutes(String(diff));
    }
  };

  const handleDurationChange = (val: string) => {
    setDurationMinutes(val);
    const mins = parseInt(val, 10);
    if (!isNaN(mins) && mins > 0) {
      if (values.startTime) {
        set('endTime', toLocalInput(new Date(new Date(values.startTime).getTime() + mins * 60000)));
      } else if (values.endTime) {
        set('startTime', toLocalInput(new Date(new Date(values.endTime).getTime() - mins * 60000)));
      }
    }
  };

  const handleEndTimeChange = (val: string) => {
    set('endTime', val);
    if (val && values.startTime) {
      const diff = Math.round((new Date(val).getTime() - new Date(values.startTime).getTime()) / 60000);
      if (diff > 0) setDurationMinutes(String(diff));
    } else if (val && durationMinutes) {
      const mins = parseInt(durationMinutes, 10);
      if (!isNaN(mins) && mins > 0) {
        set('startTime', toLocalInput(new Date(new Date(val).getTime() - mins * 60000)));
      }
    }
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof TherapyPlanFormValues, string>> = {};

    // Title: 5–100 chars
    if (!values.title.trim()) {
      errs.title = t('common.errors.required');
    } else if (values.title.trim().length < 5) {
      errs.title = t('therapyPlans.form.titleMinLength', 'Title must be at least 5 characters');
    } else if (values.title.trim().length > 100) {
      errs.title = t('therapyPlans.form.titleMaxLength', 'Title must be at most 100 characters');
    }

    // Slogan: max 60 chars
    if (values.slogan && values.slogan.length > 60) {
      errs.slogan = t('therapyPlans.form.sloganMaxLengthError', 'Maximum 60 characters');
    }

    // Introduction: 20–2000 chars
    if (!values.introduction.trim()) {
      errs.introduction = t('common.errors.required');
    } else if (values.introduction.trim().length < 20) {
      errs.introduction = t('therapyPlans.form.introMinLength', 'Introduction must be at least 20 characters');
    }

    // Start time required
    if (!values.startTime) errs.startTime = t('common.errors.required');

    // End time must be after start time if both provided
    if (values.startTime && values.endTime && values.endTime <= values.startTime) {
      errs.endTime = t('therapyPlans.form.endTimeAfterStart', 'End time must be after start time');
    }

    if (!values.location.trim()) errs.location = t('common.errors.required');
    if (!values.contactInfo.trim()) errs.contactInfo = t('common.errors.required');

    // Type-specific fields
    if (values.type === 'ART_SALON' && !values.artSalonSubType) {
      errs.artSalonSubType = t('common.errors.required');
    }
    if (values.type === 'PERSONAL_CONSULT' && !values.sessionMedium) {
      errs.sessionMedium = t('common.errors.required');
    }

    // Max participants validation
    if (values.maxParticipants) {
      const n = parseInt(values.maxParticipants, 10);
      if (isNaN(n) || n < 1) {
        errs.maxParticipants = t('therapyPlans.form.maxParticipantsMin', 'Must be at least 1');
      } else if (values.type === 'GROUP_CONSULT' && n > 12) {
        errs.maxParticipants = t('therapyPlans.form.maxParticipantsGroupError', 'Must be 1–12');
      } else if (n > 100) {
        errs.maxParticipants = t('therapyPlans.form.maxParticipantsError', 'Must be 1–100');
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(values, posterFile);
  };

  const planTypeOptions = [
    { value: 'PERSONAL_CONSULT', label: t('common.planType.PERSONAL_CONSULT') },
    { value: 'GROUP_CONSULT', label: t('common.planType.GROUP_CONSULT') },
    { value: 'ART_SALON', label: t('common.planType.ART_SALON') },
    { value: 'WELLNESS_RETREAT', label: t('common.planType.WELLNESS_RETREAT') },
  ];

  const artSalonOptions = [
    { value: 'CALLIGRAPHY', label: t('common.artSalonSubType.CALLIGRAPHY') },
    { value: 'PAINTING', label: t('common.artSalonSubType.PAINTING') },
    { value: 'DRAMA', label: t('common.artSalonSubType.DRAMA') },
    { value: 'YOGA', label: t('common.artSalonSubType.YOGA') },
    { value: 'BOARD_GAMES', label: t('common.artSalonSubType.BOARD_GAMES') },
    { value: 'CULTURAL_CONVERSATION', label: t('common.artSalonSubType.CULTURAL_CONVERSATION') },
  ];

  const mediumOptions = [
    { value: 'IN_PERSON', label: t('common.medium.IN_PERSON') },
    { value: 'VIDEO', label: t('common.medium.VIDEO') },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Rejection reason banner */}
      {rejectionReason && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-lg p-4">
          <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-rose-700">{t('therapyPlans.detail.rejectedBanner')}</p>
            <p className="text-sm text-rose-600 mt-0.5">{rejectionReason}</p>
          </div>
        </div>
      )}

      {/* General error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
          <p className="text-sm text-rose-600">{error}</p>
        </div>
      )}

      {/* Plan type */}
      <Select
        label={t('therapyPlans.form.type')}
        options={planTypeOptions}
        value={values.type}
        onChange={(e) => {
          const newType = e.target.value as TherapyPlanType;
          setValues((prev) => ({ ...prev, type: newType, events: [] }));
          setErrors((prev) => ({ ...prev, type: undefined }));
        }}
        error={errors.type}
      />

      {/* Type-specific fields */}
      {values.type === 'PERSONAL_CONSULT' && (
        <Select
          label={t('therapyPlans.form.sessionMedium')}
          options={mediumOptions}
          placeholder={t('common.select')}
          value={values.sessionMedium}
          onChange={(e) => set('sessionMedium', e.target.value as SessionMedium)}
          error={errors.sessionMedium}
        />
      )}
      {values.type === 'ART_SALON' && (
        <Select
          label={t('therapyPlans.form.artSalonSubType')}
          options={artSalonOptions}
          placeholder={t('common.select')}
          value={values.artSalonSubType}
          onChange={(e) => set('artSalonSubType', e.target.value as ArtSalonSubType)}
          error={errors.artSalonSubType}
        />
      )}
      {(values.type === 'GROUP_CONSULT' || values.type === 'ART_SALON' || values.type === 'WELLNESS_RETREAT') && (
        <>
          <Input
            type="number"
            label={t('therapyPlans.form.maxParticipants')}
            placeholder={t('therapyPlans.form.maxParticipantsPlaceholder')}
            min={1}
            max={values.type === 'GROUP_CONSULT' ? 12 : undefined}
            value={values.maxParticipants}
            onChange={(e) => set('maxParticipants', e.target.value)}
            error={errors.maxParticipants}
          />
          <Input
            type="number"
            label={t('therapyPlans.form.price')}
            placeholder={t('therapyPlans.form.pricePlaceholder')}
            min={0}
            step={0.01}
            value={values.price}
            onChange={(e) => set('price', e.target.value)}
            error={errors.price}
          />
        </>
      )}

      <Input
        label={t('therapyPlans.form.title')}
        placeholder={t('therapyPlans.form.titlePlaceholder', 'e.g. Intro to Creative Healing')}
        value={values.title}
        onChange={(e) => set('title', e.target.value)}
        error={errors.title}
        maxLength={100}
      />

      <Input
        label={t('therapyPlans.form.slogan', 'Slogan')}
        placeholder={t('therapyPlans.form.sloganPlaceholder', 'A brief, catchy subtitle (e.g. Escape to Nature)')}
        value={values.slogan}
        onChange={(e) => set('slogan', e.target.value)}
        error={errors.slogan}
        maxLength={60}
      />

      <Textarea
        label={t('therapyPlans.form.introduction')}
        placeholder={t('therapyPlans.form.introductionPlaceholder')}
        rows={4}
        value={values.introduction}
        onChange={(e) => set('introduction', e.target.value)}
        error={errors.introduction}
        maxLength={2000}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          type="datetime-local"
          label={t('therapyPlans.form.startTime')}
          value={values.startTime}
          onChange={(e) => handleStartTimeChange(e.target.value)}
          error={errors.startTime}
        />
        {/* Duration with min / h:m toggle */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-700">
              {t('therapyPlans.form.duration', 'Duration')}
            </span>
            <div className="flex rounded border border-stone-200 overflow-hidden text-xs leading-none">
              <button
                type="button"
                onClick={() => setDurationUnit('min')}
                className={`px-2 py-1 transition-colors ${
                  durationUnit === 'min'
                    ? 'bg-teal-600 text-white'
                    : 'bg-white text-stone-500 hover:bg-stone-50'
                }`}
              >
                min
              </button>
              <button
                type="button"
                onClick={() => setDurationUnit('hm')}
                className={`px-2 py-1 transition-colors border-l border-stone-200 ${
                  durationUnit === 'hm'
                    ? 'bg-teal-600 text-white'
                    : 'bg-white text-stone-500 hover:bg-stone-50'
                }`}
              >
                h : m
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
              <span className="text-stone-400 text-sm flex-shrink-0">min</span>
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
                  <span className="text-stone-400 text-sm flex-shrink-0">h</span>
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
                  <span className="text-stone-400 text-sm flex-shrink-0">m</span>
                </div>
              );
            })()
          )}
        </div>
        <Input
          type="datetime-local"
          label={`${t('therapyPlans.form.endTime')} ${t('therapyPlans.form.endTimeOptional')}`}
          value={values.endTime}
          onChange={(e) => handleEndTimeChange(e.target.value)}
          error={errors.endTime}
        />
      </div>

      {/* Schedule events — only visible for WELLNESS_RETREAT */}
      {values.type === 'WELLNESS_RETREAT' && (
        <div className="border-t border-stone-100 pt-4">
          <PlanSchedule
            mode="edit"
            drafts={values.events}
            planType={values.type}
            planStartTime={values.startTime}
            onChange={(drafts) => set('events', drafts)}
          />
        </div>
      )}

      <Input
        label={t('therapyPlans.form.location')}
        placeholder={t('therapyPlans.form.locationPlaceholder')}
        value={values.location}
        onChange={(e) => set('location', e.target.value)}
        error={errors.location}
        maxLength={300}
      />

      <Input
        label={t('therapyPlans.form.contactInfo')}
        placeholder={t('therapyPlans.form.contactInfoPlaceholder')}
        value={values.contactInfo}
        onChange={(e) => set('contactInfo', e.target.value)}
        error={errors.contactInfo}
        maxLength={300}
      />

      {/* Poster selection */}
      <div>
        <p className="text-sm font-medium text-stone-700 mb-2">{t('therapyPlans.form.posterSection')}</p>
        <PosterSelector
          value={values.poster}
          onChange={(v) => set('poster', v)}
          onFileSelected={(file) => setPosterFile(file)}
          disabled={isLoading}
        />
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {secondaryAction}
        <Button type="submit" loading={isLoading} disabled={isLoading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
