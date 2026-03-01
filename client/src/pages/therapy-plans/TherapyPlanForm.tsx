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
  return iso.slice(0, 16);
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

export interface StepChangePayload {
  values: TherapyPlanFormValues;
  posterFile: File | null;
  videoFile: File | null;
  galleryFiles: File[];
  pdfFiles: File[];
}

type Step = 1 | 2 | 3 | 4;

interface TherapyPlanFormProps {
  initialValues?: Partial<TherapyPlanFormValues>;
  /** ID of the already-created/auto-saved plan (undefined in early create mode) */
  planId?: string;
  /**
   * Called before each step advance. Parent handles saving (create/update + file uploads).
   * If it throws, the step will NOT advance.
   */
  onBeforeStepChange?: (fromStep: number, payload: StepChangePayload) => Promise<void>;
  /** Called when therapist clicks "Submit for Review" on step 4. */
  onSubmitForReview?: () => Promise<void>;
  /** Called when therapist clicks "Save Draft & Exit" on step 4. */
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
  const { t } = useTranslation();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [values, setValues] = useState<TherapyPlanFormValues>({ ...defaultValues, ...initialValues });
  const [errors, setErrors] = useState<Partial<Record<keyof TherapyPlanFormValues, string>>>({});

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
    if (!values.title.trim()) errs.title = t('common.errors.required');
    else if (values.title.trim().length < 5) errs.title = t('therapyPlans.form.titleMinLength');
    else if (values.title.trim().length > 100) errs.title = t('therapyPlans.form.titleMaxLength');

    if (values.slogan && values.slogan.length > 60) errs.slogan = t('therapyPlans.form.sloganMaxLengthError');

    if (!values.introduction.trim()) errs.introduction = t('common.errors.required');
    else if (values.introduction.trim().length < 20) errs.introduction = t('therapyPlans.form.introMinLength');

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
    setIsSubmittingForReview(true);
    try {
      await onSubmitForReview();
    } finally {
      setIsSubmittingForReview(false);
    }
  };

  // ── Stepper steps ─────────────────────────────────────────────────────────

  const steps = [
    { id: 1, name: t('therapyPlans.form.steps.metadata') },
    { id: 2, name: t('therapyPlans.form.steps.schedule') },
    { id: 3, name: t('therapyPlans.form.steps.imports') },
    { id: 4, name: t('therapyPlans.form.steps.preview') },
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
          <div className="space-y-4">
            {/* Plan ID display */}
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

          {currentStep < 4 ? (
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
                  onClick={onSaveDraftAndExit}
                  disabled={isSubmittingForReview}
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
                  disabled={isSubmittingForReview}
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
