import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle, LogOut } from 'lucide-react';
import type { TherapyPlan, TherapyPlanImage, TherapyPlanType, ArtSalonSubType, SessionMedium } from '../../types';
import { Button } from '../../components/ui/Button';
import { PosterValue } from '../../components/therapyPlans/PosterSelector';
import {
  eventsToFormDrafts,
  type PlanEventDraft,
} from '../../components/therapyPlans/PlanSchedule';

import { Step1Metadata, type Step1Values } from '../../components/therapyPlans/wizard/Step1Metadata';
import { Step2Schedule } from '../../components/therapyPlans/wizard/Step2Schedule';
import { Step3Imports } from '../../components/therapyPlans/wizard/Step3Imports';
import { Step4Preview } from '../../components/therapyPlans/wizard/Step4Preview';
import { translateBatch, type TranslateBatchItemInput, type TranslateLang } from '../../api/translate';

export interface TherapyPlanFormValues {
  type: TherapyPlanType;
  title: string;
  titleEn: string;
  slogan: string;
  sloganEn: string;
  introduction: string;
  introductionEn: string;
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
  titleEn: '',
  slogan: '',
  sloganEn: '',
  introduction: '',
  introductionEn: '',
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
  return iso.slice(0, 16);
};

export const planToFormValues = (plan: TherapyPlan): TherapyPlanFormValues => ({
  type: plan.type,
  title: plan.titleI18n?.zh ?? plan.title,
  titleEn: plan.titleI18n?.en ?? plan.title,
  slogan: plan.sloganI18n?.zh ?? plan.slogan ?? '',
  sloganEn: plan.sloganI18n?.en ?? plan.slogan ?? '',
  introduction: plan.introductionI18n?.zh ?? plan.introduction,
  introductionEn: plan.introductionI18n?.en ?? plan.introduction,
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

export interface StepChangePayload {
  values: TherapyPlanFormValues;
  posterFile: File | null;
  videoFile: File | null;
  galleryFiles: File[];
  pdfFiles: File[];
}

type Step = 1 | 2 | 3 | 4 | 5;
type LocalizedBaseField = 'title' | 'slogan' | 'introduction';
type LocalizedLang = 'zh' | 'en';
type TranslationStatus = 'idle' | 'pending' | 'success' | 'failed';

type TranslationFieldState = {
  status: TranslationStatus;
  sourceLang: LocalizedLang | null;
  errorCode?: string;
};

const defaultTranslationState: Record<LocalizedBaseField, TranslationFieldState> = {
  title: { status: 'idle', sourceLang: null },
  slogan: { status: 'idle', sourceLang: null },
  introduction: { status: 'idle', sourceLang: null },
};

interface TherapyPlanFormProps {
  initialValues?: Partial<TherapyPlanFormValues>;
  /** ID of the already-created/auto-saved plan (undefined in early create mode) */
  planId?: string;
  /**
   * Called before each step advance. Parent handles saving (create/update + file uploads).
   * If it throws, the step will NOT advance.
   */
  onBeforeStepChange?: (fromStep: number, payload: StepChangePayload) => Promise<void>;
  /** Called when therapist clicks "Submit for Review" on final step. */
  onSubmitForReview?: () => Promise<void>;
  /** Called when therapist clicks "Save Draft & Exit" on final step. */
  onSaveDraftAndExit?: () => void;
  /** Called when therapist clicks the Exit button on any step. */
  onExit: () => void;
  /** External loading flag (e.g. parent-level operations). */
  isSaving?: boolean;
  error?: string | null;
  rejectionReason?: string | null;
  videoUploadPercent?: number;

  existingVideoUrl?: string | null;
  galleryImages?: TherapyPlanImage[];
  onAddGalleryImage?: (file: File) => void;
  onDeleteGalleryImage?: (imageId: string) => void;
  isAddingGalleryImage?: boolean;
  galleryUploadError?: string | null;

  existingPdfs?: Array<{ id: string; url: string; name: string }>;
  onAddPdf?: (file: File) => void;
  onDeletePdf?: (id: string) => void;
  isAddingPdf?: boolean;
  consultEnabled?: boolean;
}

export const TherapyPlanForm = ({
  initialValues,
  planId,
  onBeforeStepChange,
  onSubmitForReview,
  onSaveDraftAndExit,
  onExit,
  isSaving,
  error,
  rejectionReason,
  existingVideoUrl,
  galleryImages = [],
  onAddGalleryImage,
  onDeleteGalleryImage,
  isAddingGalleryImage,
  galleryUploadError,
  existingPdfs = [],
  onAddPdf,
  onDeletePdf,
  isAddingPdf,
  videoUploadPercent = 0,
  consultEnabled = false,
}: TherapyPlanFormProps) => {
  const { t, i18n } = useTranslation();
  const userLang: LocalizedLang = i18n.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  const translationSourceLang: TranslateLang = userLang;
  const translationTargetLang: TranslateLang = userLang === 'zh' ? 'en' : 'zh';

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [values, setValues] = useState<TherapyPlanFormValues>({ ...defaultValues, ...initialValues });
  const [errors, setErrors] = useState<Partial<Record<keyof TherapyPlanFormValues, string>>>({});
  const [translationState, setTranslationState] = useState<Record<LocalizedBaseField, TranslationFieldState>>(
    defaultTranslationState,
  );
  const [translationSkipped, setTranslationSkipped] = useState(false);
  const [translationMode, setTranslationMode] = useState<'auto' | 'manual' | null>(null);
  const [translationMessage, setTranslationMessage] = useState<string | null>(null);
  const [translationReviewed, setTranslationReviewed] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // Track whether the user has made changes since the last auto-save
  const [hasStepChanges, setHasStepChanges] = useState(false);
  // Internal loading states
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isSubmittingForReview, setIsSubmittingForReview] = useState(false);

  // File states
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [stagedGalleryFiles, setStagedGalleryFiles] = useState<File[]>([]);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  // Mark dirty when any file changes (skip the initial mount)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setHasStepChanges(true);
  }, [posterFile, videoFile, stagedGalleryFiles, pdfFiles]);

  // Time handling
  const [durationMinutes, setDurationMinutes] = useState<string>(() => {
    const s = initialValues?.startTime ?? '';
    const e = initialValues?.endTime ?? '';
    if (s && e) {
      const diff = Math.round((new Date(e).getTime() - new Date(s).getTime()) / 60000);
      if (diff > 0) return String(diff);
    }
    return '';
  });

  // ── Value helpers ─────────────────────────────────────────────────────────

  const set = <K extends keyof TherapyPlanFormValues>(key: K, val: TherapyPlanFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    const fieldMap: Record<string, { field: LocalizedBaseField; lang: LocalizedLang }> = {
      title: { field: 'title', lang: 'zh' },
      titleEn: { field: 'title', lang: 'en' },
      slogan: { field: 'slogan', lang: 'zh' },
      sloganEn: { field: 'slogan', lang: 'en' },
      introduction: { field: 'introduction', lang: 'zh' },
      introductionEn: { field: 'introduction', lang: 'en' },
    };

    const mapped = fieldMap[String(key)];
    if (mapped) {
      setTranslationState((prev) => ({
        ...prev,
        [mapped.field]: { status: 'idle', sourceLang: mapped.lang },
      }));
      setTranslationSkipped(false);
      setTranslationMode(null);
      setTranslationMessage(null);
      setTranslationReviewed(false);
    }
    setHasStepChanges(true);
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

  // ── Validation ────────────────────────────────────────────────────────────

  const validateStep1 = (): boolean => {
    const errs: Partial<Record<keyof TherapyPlanFormValues, string>> = {};
    const titleZh = values.title.trim();
    const titleEn = values.titleEn.trim();
    const titlePrimary = userLang === 'zh' ? titleZh : titleEn;
    if (!titlePrimary) {
      if (userLang === 'zh') errs.title = t('common.errors.required');
      else errs.titleEn = t('common.errors.required');
    }
    if (titlePrimary && titlePrimary.length < 5) {
      if (userLang === 'zh') errs.title = t('therapyPlans.form.titleMinLength');
      else errs.titleEn = t('therapyPlans.form.titleMinLength');
    }
    if (titlePrimary && titlePrimary.length > 100) {
      if (userLang === 'zh') errs.title = t('therapyPlans.form.titleMaxLength');
      else errs.titleEn = t('therapyPlans.form.titleMaxLength');
    }

    const sloganPrimary = userLang === 'zh' ? values.slogan : values.sloganEn;
    if (sloganPrimary && sloganPrimary.length > 60) {
      if (userLang === 'zh') errs.slogan = t('therapyPlans.form.sloganMaxLengthError');
      else errs.sloganEn = t('therapyPlans.form.sloganMaxLengthError');
    }

    const introZh = values.introduction.trim();
    const introEn = values.introductionEn.trim();
    const introPrimary = userLang === 'zh' ? introZh : introEn;
    if (!introPrimary) {
      if (userLang === 'zh') errs.introduction = t('common.errors.required');
      else errs.introductionEn = t('common.errors.required');
    }
    if (introPrimary && introPrimary.length < 20) {
      if (userLang === 'zh') errs.introduction = t('therapyPlans.form.introMinLength');
      else errs.introductionEn = t('therapyPlans.form.introMinLength');
    }

    if (!values.location.trim()) errs.location = t('common.errors.required');
    if (!values.contactInfo.trim()) errs.contactInfo = t('common.errors.required');

    if (values.type === 'ART_SALON' && !values.artSalonSubType) errs.artSalonSubType = t('common.errors.required');
    if (values.type === 'PERSONAL_CONSULT' && !values.sessionMedium) errs.sessionMedium = t('common.errors.required');

    if (values.maxParticipants) {
      const n = parseInt(values.maxParticipants, 10);
      if (isNaN(n) || n < 1) errs.maxParticipants = t('therapyPlans.form.maxParticipantsMin');
      else if (values.type === 'GROUP_CONSULT' && n > 12) errs.maxParticipants = t('therapyPlans.form.maxParticipantsGroupError');
      else if (n > 100) errs.maxParticipants = t('therapyPlans.form.maxParticipantsError');
    }

    if (values.price) {
      const p = parseFloat(values.price);
      if (isNaN(p) || p < 0) errs.price = t('therapyPlans.form.priceInvalid', 'Invalid price format');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Partial<Record<keyof TherapyPlanFormValues, string>> = {};
    if (!values.startTime) errs.startTime = t('common.errors.required');
    if (values.startTime && values.endTime && values.endTime <= values.startTime) {
      errs.endTime = t('therapyPlans.form.endTimeAfterStart');
    }
    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  // ── Navigation ────────────────────────────────────────────────────────────

  const handleNext = async () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 4 && !translationReviewed) {
      setTranslationMessage(t('translation.reviewRequired', 'Please complete the translation checkpoint before final submission.'));
      return;
    }

    if (onBeforeStepChange) {
      setIsAutoSaving(true);
      try {
        await onBeforeStepChange(currentStep, {
          values,
          posterFile,
          videoFile,
          galleryFiles: stagedGalleryFiles,
          pdfFiles,
        });
        // After step 3 → 4 files are uploaded, clear staged states
        if (currentStep === 3) {
          setVideoFile(null);
          setStagedGalleryFiles([]);
          setPdfFiles([]);
        }
      } catch {
        setIsAutoSaving(false);
        return; // Don't advance if auto-save failed
      }
      setIsAutoSaving(false);
    }

    setCurrentStep((prev) => (prev + 1) as Step);
    setHasStepChanges(false);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as Step);
  };

  const handleExit = () => {
    if (hasStepChanges) {
      if (!window.confirm(
        t(
          'therapyPlans.form.exitConfirm',
          'Changes on this step have not been auto-saved yet (auto-save runs when you click "Next Step"). Exit anyway? Changes on this step will be discarded.',
        ),
      )) return;
    }
    onExit();
  };

  const handleSubmitForReview = async () => {
    if (!onSubmitForReview) return;
    if (!translationReviewed) {
      setTranslationMessage(t('translation.reviewRequired', 'Please complete the translation checkpoint before final submission.'));
      return;
    }
    if (onBeforeStepChange && hasStepChanges) {
      setIsAutoSaving(true);
      try {
        await onBeforeStepChange(currentStep, {
          values,
          posterFile,
          videoFile,
          galleryFiles: stagedGalleryFiles,
          pdfFiles,
        });
        setHasStepChanges(false);
      } catch {
        setIsAutoSaving(false);
        return;
      }
      setIsAutoSaving(false);
    }

    setIsSubmittingForReview(true);
    try {
      await onSubmitForReview();
    } finally {
      setIsSubmittingForReview(false);
    }
  };

  const handleSaveDraftAndExit = async () => {
    if (!onSaveDraftAndExit) return;
    if (onBeforeStepChange && hasStepChanges) {
      setIsAutoSaving(true);
      try {
        await onBeforeStepChange(currentStep, {
          values,
          posterFile,
          videoFile,
          galleryFiles: stagedGalleryFiles,
          pdfFiles,
        });
        setHasStepChanges(false);
      } catch {
        setIsAutoSaving(false);
        return;
      }
      setIsAutoSaving(false);
    }
    onSaveDraftAndExit();
  };

  const translationRows: Array<{
    field: LocalizedBaseField;
    label: string;
    sourceKey: keyof TherapyPlanFormValues;
    targetKey: keyof TherapyPlanFormValues;
    multiline?: boolean;
  }> = [
    {
      field: 'title',
      label: t('therapyPlans.form.title'),
      sourceKey: translationSourceLang === 'zh' ? 'title' : 'titleEn',
      targetKey: translationSourceLang === 'zh' ? 'titleEn' : 'title',
    },
    {
      field: 'slogan',
      label: t('therapyPlans.form.slogan'),
      sourceKey: translationSourceLang === 'zh' ? 'slogan' : 'sloganEn',
      targetKey: translationSourceLang === 'zh' ? 'sloganEn' : 'slogan',
    },
    {
      field: 'introduction',
      label: t('therapyPlans.form.introduction'),
      sourceKey: translationSourceLang === 'zh' ? 'introduction' : 'introductionEn',
      targetKey: translationSourceLang === 'zh' ? 'introductionEn' : 'introduction',
      multiline: true,
    },
  ];

  const handleTranslationFieldChange = (
    key: keyof TherapyPlanFormValues,
    field: LocalizedBaseField,
    value: string,
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setTranslationState((prev) => ({
      ...prev,
      [field]: { status: 'idle', sourceLang: translationSourceLang },
    }));
    setTranslationSkipped(false);
    setTranslationMode('manual');
    setTranslationMessage(null);
    setTranslationReviewed(true);
    setHasStepChanges(true);
  };

  const handleSkipTranslation = () => {
    setTranslationSkipped(true);
    setTranslationMode('manual');
    setTranslationMessage(null);
    setTranslationReviewed(true);
  };

  const handleTranslateStep4 = async () => {
    const tasks: Array<{
      field: LocalizedBaseField;
      targetKey: keyof TherapyPlanFormValues;
      request: TranslateBatchItemInput;
    }> = [];

    const preState: Record<LocalizedBaseField, TranslationFieldState> = {
      title: { status: 'idle', sourceLang: null },
      slogan: { status: 'idle', sourceLang: null },
      introduction: { status: 'idle', sourceLang: null },
    };

    translationRows.forEach((row) => {
      const sourceText = String(values[row.sourceKey] ?? '').trim();
      if (!sourceText) {
        preState[row.field] = { status: 'failed', sourceLang: translationSourceLang, errorCode: 'EMPTY_SOURCE' };
        return;
      }

      preState[row.field] = { status: 'pending', sourceLang: translationSourceLang };
      tasks.push({
        field: row.field,
        targetKey: row.targetKey,
        request: {
          key: String(row.targetKey),
          text: sourceText,
          sourceLang: translationSourceLang,
          targetLang: translationTargetLang,
        },
      });
    });

    setTranslationState(preState);
    setTranslationSkipped(false);
    setTranslationMessage(null);
    setTranslationMode(null);
    setTranslationReviewed(false);

    if (!tasks.length) {
      setTranslationMode('manual');
      setTranslationMessage(t('translation.manualFallback'));
      setTranslationReviewed(true);
      return;
    }

    setIsTranslating(true);
    try {
      const response = await translateBatch(tasks.map((task) => task.request));
      const resultMap = new Map(response.results.map((result) => [result.key, result]));

      setValues((prev) => {
        const next = { ...prev };
        tasks.forEach((task) => {
          const result = resultMap.get(task.request.key);
          if (result?.status === 'ok' && typeof result.translatedText === 'string') {
            (next[task.targetKey] as string) = result.translatedText;
          }
        });
        return next;
      });
      setHasStepChanges(true);

      setErrors((prev) => ({
        ...prev,
        title: undefined,
        titleEn: undefined,
        slogan: undefined,
        sloganEn: undefined,
        introduction: undefined,
        introductionEn: undefined,
      }));

      setTranslationState((prev) => {
        const next = { ...prev };
        tasks.forEach((task) => {
          const result = resultMap.get(task.request.key);
          if (result?.status === 'ok') {
            next[task.field] = {
              status: 'success',
              sourceLang: translationSourceLang,
            };
          } else {
            next[task.field] = {
              status: 'failed',
              sourceLang: translationSourceLang,
              errorCode: result?.errorCode ?? 'TRANSLATION_FAILED',
            };
          }
        });
        return next;
      });

      const hasFailures = response.results.some((result) => result.status === 'failed');
      setTranslationMode(response.mode);
      if (response.mode === 'manual') {
        setTranslationMessage(t('translation.manualFallback'));
      } else if (hasFailures) {
        setTranslationMessage(t('translation.partialFailure'));
      } else {
        setTranslationMessage(null);
      }
    } catch {
      setTranslationMode('manual');
      setTranslationMessage(t('translation.manualFallback'));
      setTranslationState((prev) => {
        const next = { ...prev };
        tasks.forEach((task) => {
          next[task.field] = {
            status: 'failed',
            sourceLang: translationSourceLang,
            errorCode: 'NETWORK_ERROR',
          };
        });
        return next;
      });
    } finally {
      setIsTranslating(false);
      setTranslationReviewed(true);
    }
  };

  // ── Stepper steps ─────────────────────────────────────────────────────────

  const steps = [
    { id: 1, name: t('therapyPlans.form.steps.metadata') },
    { id: 2, name: t('therapyPlans.form.steps.schedule') },
    { id: 3, name: t('therapyPlans.form.steps.imports') },
    { id: 4, name: t('therapyPlans.form.steps.translation', 'Translation') },
    { id: 5, name: t('therapyPlans.form.steps.preview') },
  ];

  const isNextBusy = isAutoSaving || !!isSaving;

  return (
    <div className="space-y-6">
      {/* Rejection Banner */}
      {rejectionReason && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-lg p-4">
          <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-rose-700">{t('therapyPlans.detail.rejectedBanner')}</p>
            <p className="text-sm text-rose-600 mt-0.5">{rejectionReason}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
          <p className="text-sm text-rose-600">{error}</p>
        </div>
      )}

      {/* Stepper Header */}
      <nav aria-label="Progress">
        <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
          {steps.map((step) => (
            <li key={step.name} className="md:flex-1">
              <button
                onClick={() => {
                  // Only allow navigating backwards via stepper; forward requires "Next"
                  if (step.id < currentStep) setCurrentStep(step.id as Step);
                }}
                disabled={step.id >= currentStep}
                className={`group flex w-full flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4 text-left ${currentStep > step.id
                  ? 'border-teal-600 hover:border-teal-800 cursor-pointer'
                  : currentStep === step.id
                    ? 'border-teal-600 cursor-default'
                    : 'border-stone-200 cursor-not-allowed'
                  }`}
              >
                <span className={`text-sm font-medium ${currentStep > step.id ? 'text-teal-600 group-hover:text-teal-800' : currentStep === step.id ? 'text-teal-600' : 'text-stone-400'}`}>
                  {t('therapyPlans.form.step', { n: step.id })} {currentStep > step.id && <CheckCircle className="inline h-4 w-4 mb-0.5 ml-1" />}
                </span>
                <span className="text-sm font-medium text-stone-900">{step.name}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* Form Content */}
      <div className="pt-4">
        {currentStep === 1 && (
          <Step1Metadata
            values={values as Step1Values}
            errors={errors}
            set={set}
            setValues={setValues}
            setErrors={setErrors}
            posterFile={posterFile}
            setPosterFile={setPosterFile}
            isLoading={isNextBusy}
            consultEnabled={consultEnabled}
          />
        )}
        {currentStep === 2 && (
          <Step2Schedule
            values={values}
            errors={errors}
            set={set}
            handleStartTimeChange={handleStartTimeChange}
            handleEndTimeChange={handleEndTimeChange}
            durationMinutes={durationMinutes}
            handleDurationChange={handleDurationChange}
          />
        )}
        {currentStep === 3 && (
          <Step3Imports
            isLoading={isNextBusy}
            videoUploadPercent={videoUploadPercent}
            videoFile={videoFile}
            setVideoFile={setVideoFile}
            existingVideoUrl={existingVideoUrl}
            videoError={videoError}
            setVideoError={setVideoError}
            galleryImages={galleryImages}
            stagedGalleryFiles={stagedGalleryFiles}
            setStagedGalleryFiles={setStagedGalleryFiles}
            onAddGalleryImage={onAddGalleryImage}
            onDeleteGalleryImage={onDeleteGalleryImage}
            isAddingGalleryImage={isAddingGalleryImage}
            galleryError={galleryError}
            setGalleryError={setGalleryError}
            galleryUploadError={galleryUploadError}
            pdfFiles={pdfFiles}
            setPdfFiles={setPdfFiles}
            existingPdfs={existingPdfs}
            onAddPdf={onAddPdf}
            onDeletePdf={onDeletePdf}
            isAddingPdf={isAddingPdf}
            pdfError={pdfError}
            setPdfError={setPdfError}
            planType={values.type}
          />
        )}
        {currentStep === 4 && (
          <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-stone-900">
                  {t('translation.optionalStepTitle')}
                </h4>
                <p className="text-xs text-stone-500">
                  {translationSkipped ? t('translation.skipped') : t('translation.optionalHint')}
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  {t('translation.manualEditHint')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkipTranslation}
                  disabled={isTranslating || isSubmittingForReview}
                >
                  {t('translation.skip')}
                </Button>
                <Button
                  type="button"
                  onClick={handleTranslateStep4}
                  loading={isTranslating}
                  disabled={isTranslating || isSubmittingForReview}
                >
                  {t('translation.translateNow')}
                </Button>
              </div>
            </div>

            {translationMessage && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                {translationMessage}
              </p>
            )}

            <div className="hidden md:grid md:grid-cols-2 gap-3 px-1">
              <p className="text-xs font-medium text-stone-600">
                {t('translation.sourceColumn', { lang: t(`translation.sourceDetected.${translationSourceLang}`) })}
              </p>
              <p className="text-xs font-medium text-stone-600">
                {t('translation.resultColumn', { lang: t(`translation.sourceDetected.${translationTargetLang}`) })}
              </p>
            </div>

            <div className="space-y-3">
              {translationRows.map((row) => {
                const state = translationState[row.field];
                const sourceValue = String(values[row.sourceKey] ?? '');
                const targetValue = String(values[row.targetKey] ?? '');
                const statusClass =
                  state.status === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : state.status === 'failed'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : state.status === 'pending'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-stone-50 text-stone-600 border-stone-200';
                return (
                  <div
                    key={row.field}
                    className="rounded-md border border-stone-200 p-3"
                  >
                    <p className="text-sm font-medium text-stone-800 mb-2">{row.label}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        {row.multiline ? (
                          <textarea
                            rows={4}
                            value={sourceValue}
                            onChange={(e) => handleTranslationFieldChange(row.sourceKey, row.field, e.target.value)}
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={sourceValue}
                            onChange={(e) => handleTranslationFieldChange(row.sourceKey, row.field, e.target.value)}
                            className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        )}
                      </div>
                      <div>
                        {row.multiline ? (
                          <textarea
                            rows={4}
                            value={targetValue}
                            onChange={(e) => handleTranslationFieldChange(row.targetKey, row.field, e.target.value)}
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={targetValue}
                            onChange={(e) => handleTranslationFieldChange(row.targetKey, row.field, e.target.value)}
                            className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass}`}>
                        {t(`translation.status.${state.status}`)}
                      </span>
                      {state.errorCode && state.status === 'failed' && (
                        <span className="text-xs text-rose-600">{state.errorCode}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {translationMode && (
              <p className="text-xs text-stone-500">
                {t('translation.modeLabel')}: {translationMode.toUpperCase()}
              </p>
            )}
          </div>
        )}
        {currentStep === 5 && (
          <div className="space-y-4">
            {planId && (
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <span className="font-medium">{t('therapyPlans.form.planId', 'Plan ID')}:</span>
                <code className="font-mono bg-stone-100 px-2 py-0.5 rounded text-stone-500 select-all">{planId}</code>
              </div>
            )}
            <Step4Preview
              values={values}
              posterFile={posterFile}
              videoFile={videoFile}
              stagedGalleryFiles={stagedGalleryFiles}
              pdfFiles={pdfFiles}
              existingGalleryCount={galleryImages.length}
              existingVideoUrl={existingVideoUrl}
              existingPdfCount={existingPdfs.length}
            />
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between border-t border-stone-200 pt-6 mt-8">
        {/* Left: Exit */}
        <Button
          variant="ghost"
          type="button"
          onClick={handleExit}
          disabled={isNextBusy || isSubmittingForReview}
          className="text-stone-500 hover:text-stone-700"
        >
          <LogOut className="h-4 w-4 mr-1.5" />
          {t('common.exit', 'Exit')}
        </Button>

        {/* Right: navigation / submit actions */}
        <div className="flex items-center gap-3">
          {currentStep > 1 && (
            <Button
              variant="outline"
              type="button"
              onClick={handleBack}
              disabled={isNextBusy || isSubmittingForReview}
            >
              {t('common.back', 'Back')}
            </Button>
          )}

          {currentStep < 5 ? (
            <Button
              type="button"
              onClick={handleNext}
              loading={isNextBusy}
              disabled={isNextBusy}
            >
              {isAutoSaving
                ? t('therapyPlans.form.saving', 'Saving…')
                : t('therapyPlans.form.nextStep')}
            </Button>
          ) : (
            <>
              {/* Save Draft & Exit — always available once a plan exists */}
              {(planId || onSaveDraftAndExit) && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleSaveDraftAndExit}
                  disabled={isSubmittingForReview || isAutoSaving}
                >
                  {t('therapyPlans.form.saveDraftAndExit', 'Save Draft & Exit')}
                </Button>
              )}
              {/* Submit for Review — only shown when the plan can be submitted */}
              {onSubmitForReview && (
                <Button
                  type="button"
                  onClick={handleSubmitForReview}
                  loading={isSubmittingForReview}
                  disabled={isSubmittingForReview || !translationReviewed}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {t('therapyPlans.form.submitForReview')}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
