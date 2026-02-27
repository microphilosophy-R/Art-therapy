import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import type { TherapyPlan, TherapyPlanType, ArtSalonSubType, SessionMedium } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { PosterSelector, type PosterValue } from '../../components/therapyPlans/PosterSelector';

export interface TherapyPlanFormValues {
  type:            TherapyPlanType;
  title:           string;
  introduction:    string;
  startTime:       string;
  endTime:         string;
  location:        string;
  maxParticipants: string;
  contactInfo:     string;
  artSalonSubType: ArtSalonSubType | '';
  sessionMedium:   SessionMedium | '';
  poster:          PosterValue;
}

const defaultValues: TherapyPlanFormValues = {
  type:            'PERSONAL_CONSULT',
  title:           '',
  introduction:    '',
  startTime:       '',
  endTime:         '',
  location:        '',
  maxParticipants: '',
  contactInfo:     '',
  artSalonSubType: '',
  sessionMedium:   '',
  poster:          { type: 'default', id: 1 },
};

const toDatetimeLocal = (iso?: string | null): string => {
  if (!iso) return '';
  return iso.slice(0, 16); // "YYYY-MM-DDTHH:MM"
};

export const planToFormValues = (plan: TherapyPlan): TherapyPlanFormValues => ({
  type:            plan.type,
  title:           plan.title,
  introduction:    plan.introduction,
  startTime:       toDatetimeLocal(plan.startTime),
  endTime:         toDatetimeLocal(plan.endTime),
  location:        plan.location,
  maxParticipants: plan.maxParticipants != null ? String(plan.maxParticipants) : '',
  contactInfo:     plan.contactInfo,
  artSalonSubType: plan.artSalonSubType ?? '',
  sessionMedium:   plan.sessionMedium ?? '',
  poster:          plan.posterUrl
    ? { type: 'custom', url: plan.posterUrl }
    : { type: 'default', id: plan.defaultPosterId ?? 1 },
});

interface TherapyPlanFormProps {
  initialValues?: Partial<TherapyPlanFormValues>;
  onSubmit: (values: TherapyPlanFormValues, posterFile: File | null) => Promise<void>;
  submitLabel: string;
  isLoading?: boolean;
  error?: string | null;
  /** If provided, shown in an info banner above the form */
  rejectionReason?: string | null;
}

export const TherapyPlanForm = ({
  initialValues,
  onSubmit,
  submitLabel,
  isLoading,
  error,
  rejectionReason,
}: TherapyPlanFormProps) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<TherapyPlanFormValues>({
    ...defaultValues,
    ...initialValues,
  });
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof TherapyPlanFormValues, string>>>({});

  const set = <K extends keyof TherapyPlanFormValues>(key: K, val: TherapyPlanFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof TherapyPlanFormValues, string>> = {};
    if (!values.title.trim())        errs.title        = t('common.errors.required');
    if (!values.introduction.trim()) errs.introduction = t('common.errors.required');
    if (!values.startTime)           errs.startTime    = t('common.errors.required');
    if (!values.location.trim())     errs.location     = t('common.errors.required');
    if (!values.contactInfo.trim())  errs.contactInfo  = t('common.errors.required');
    if (values.type === 'ART_SALON' && !values.artSalonSubType) {
      errs.artSalonSubType = t('common.errors.required');
    }
    if (values.type === 'PERSONAL_CONSULT' && !values.sessionMedium) {
      errs.sessionMedium = t('common.errors.required');
    }
    if (values.maxParticipants && values.type === 'GROUP_CONSULT') {
      const n = parseInt(values.maxParticipants, 10);
      if (isNaN(n) || n < 1 || n > 12) {
        errs.maxParticipants = t('therapyPlans.form.maxParticipantsGroupError', 'Must be 1–12');
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
    { value: 'GROUP_CONSULT',    label: t('common.planType.GROUP_CONSULT') },
    { value: 'ART_SALON',        label: t('common.planType.ART_SALON') },
    { value: 'WELLNESS_RETREAT', label: t('common.planType.WELLNESS_RETREAT') },
  ];

  const artSalonOptions = [
    { value: 'CALLIGRAPHY',           label: t('common.artSalonSubType.CALLIGRAPHY') },
    { value: 'PAINTING',              label: t('common.artSalonSubType.PAINTING') },
    { value: 'DRAMA',                 label: t('common.artSalonSubType.DRAMA') },
    { value: 'YOGA',                  label: t('common.artSalonSubType.YOGA') },
    { value: 'BOARD_GAMES',           label: t('common.artSalonSubType.BOARD_GAMES') },
    { value: 'CULTURAL_CONVERSATION', label: t('common.artSalonSubType.CULTURAL_CONVERSATION') },
  ];

  const mediumOptions = [
    { value: 'IN_PERSON', label: t('common.medium.IN_PERSON') },
    { value: 'VIDEO',     label: t('common.medium.VIDEO') },
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
        onChange={(e) => set('type', e.target.value as TherapyPlanType)}
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
      )}

      {/* Core fields */}
      <Input
        label={t('therapyPlans.form.title')}
        placeholder={t('therapyPlans.form.titlePlaceholder')}
        value={values.title}
        onChange={(e) => set('title', e.target.value)}
        error={errors.title}
        maxLength={200}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          type="datetime-local"
          label={t('therapyPlans.form.startTime')}
          value={values.startTime}
          onChange={(e) => set('startTime', e.target.value)}
          error={errors.startTime}
        />
        <div className="flex flex-col gap-1">
          <Input
            type="datetime-local"
            label={`${t('therapyPlans.form.endTime')} ${t('therapyPlans.form.endTimeOptional')}`}
            value={values.endTime}
            onChange={(e) => set('endTime', e.target.value)}
          />
        </div>
      </div>

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
      <div className="flex justify-end pt-2">
        <Button type="submit" isLoading={isLoading} disabled={isLoading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
