import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle } from 'lucide-react';
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

interface TherapyPlanFormProps {
  initialValues?: Partial<TherapyPlanFormValues>;
  onSubmit: (values: TherapyPlanFormValues, posterFile: File | null, videoFile: File | null, galleryFiles: File[], pdfFiles: File[]) => Promise<void>;
  submitLabel: string;
  isLoading?: boolean;
  error?: string | null;
  rejectionReason?: string | null;
  secondaryAction?: React.ReactNode;
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
  isCreateMode?: boolean;
}

export const TherapyPlanForm = ({
  initialValues,
  onSubmit,
  submitLabel,
  isLoading,
  error,
  rejectionReason,
  secondaryAction,
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
  isCreateMode = false,
}: TherapyPlanFormProps) => {
  const { t } = useTranslation();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [values, setValues] = useState<TherapyPlanFormValues>({ ...defaultValues, ...initialValues });
  const [errors, setErrors] = useState<Partial<Record<keyof TherapyPlanFormValues, string>>>({});

  // File states
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [stagedGalleryFiles, setStagedGalleryFiles] = useState<File[]>([]);
  const [galleryError, setGalleryError] = useState<string | null>(null);

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

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(values, posterFile, videoFile, stagedGalleryFiles, pdfFiles);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, name: t('therapyPlans.form.steps.metadata') },
    { id: 2, name: t('therapyPlans.form.steps.schedule') },
    { id: 3, name: t('therapyPlans.form.steps.imports') },
    { id: 4, name: t('therapyPlans.form.steps.preview') },
  ];

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
                  if (step.id < currentStep) setCurrentStep(step.id);
                  else if (step.id === 2 && currentStep === 1) handleNext();
                  else if (step.id === 3 && currentStep === 2) handleNext();
                  else if (step.id === 4 && currentStep === 3) handleNext();
                  else if (step.id === 3 && currentStep === 1) {
                    if (validateStep1()) {
                      setCurrentStep(2);
                      setTimeout(() => {
                        setCurrentStep(3);
                      }, 0);
                    }
                  } else if (step.id === 4 && currentStep === 1) {
                    if (validateStep1()) {
                      setCurrentStep(2);
                      setTimeout(() => {
                        setCurrentStep(4);
                      }, 0);
                    }
                  }
                }}
                className={`group flex w-full flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4 text-left ${currentStep > step.id
                  ? 'border-teal-600 hover:border-teal-800'
                  : currentStep === step.id
                    ? 'border-teal-600'
                    : 'border-stone-200 hover:border-stone-300'
                  }`}
              >
                <span className={`text-sm font-medium ${currentStep > step.id ? 'text-teal-600 group-hover:text-teal-800' : currentStep === step.id ? 'text-teal-600' : 'text-stone-500 group-hover:text-stone-700'}`}>
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
            isLoading={isLoading}
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
            isLoading={isLoading}
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
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between border-t border-stone-200 pt-6 mt-8">
        <div>
          {secondaryAction && currentStep === 3 && secondaryAction}
        </div>
        <div className="flex items-center gap-3">
          {currentStep > 1 && (
            <Button
              variant="outline"
              type="button"
              onClick={handleBack}
              disabled={isLoading || isSubmitting}
            >
              {t('common.back', 'Back')}
            </Button>
          )}

          {currentStep < 4 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isLoading || isSubmitting}
            >
              {t('therapyPlans.form.nextStep')}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              loading={isLoading || isSubmitting}
              disabled={isLoading || isSubmitting}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isCreateMode ? t('therapyPlans.form.submitForReview') : t('therapyPlans.form.saveAndExit')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
