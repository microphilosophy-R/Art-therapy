import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createTherapyPlan,
  getTherapyPlan,
  updateTherapyPlan,
  uploadTherapyPlanPoster,
  uploadTherapyPlanVideo,
  addTherapyPlanImage,
  deleteTherapyPlanImage,
  addTherapyPlanPdf,
  deleteTherapyPlanPdf,
  submitTherapyPlanForReview,
  upsertTherapyPlanEvents,
  closeTherapyPlanSignup,
  startTherapyPlan,
  finishTherapyPlan,
  moveTherapyPlanToGallery,
  cancelTherapyPlan,
} from '../../api/therapyPlans';
import { saveTherapyPlanAsTemplate } from '../../api/therapyPlanTemplates';
import { draftsToApiPayload } from '../../components/therapyPlans/PlanSchedule';
import { TherapyPlanForm, planToFormValues, type TherapyPlanFormValues, type StepChangePayload } from './TherapyPlanForm';
import { getTherapist } from '../../api/therapists';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Input } from '../../components/ui/Input';
import { TemplatePickerModal } from '../../components/therapyPlans/TemplatePickerModal';
import type { TherapyPlanTemplate, TherapyPlanType } from '../../types';
import { useAuthStore } from '../../store/authStore';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'> = {
  DRAFT: 'outline',
  PENDING_REVIEW: 'warning',
  PUBLISHED: 'success',
  REJECTED: 'danger',
  SIGN_UP_CLOSED: 'warning',
  IN_PROGRESS: 'info',
  FINISHED: 'default',
  IN_GALLERY: 'outline',
  CANCELLED: 'danger',
  ARCHIVED: 'default',
};

export const EditTherapyPlan = () => {
  const { id } = useParams<{ id: string }>();
  const isCreateMode = !id;
  const navigate = useNavigate();

  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [saveError, setSaveError] = useState<string | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [videoUploadPercent, setVideoUploadPercent] = useState(0);

  // Auto-save: track the plan ID created during step-by-step save in create mode
  const [autoSavePlanId, setAutoSavePlanId] = useState<string | null>(null);

  const { data: myProfile } = useQuery({
    queryKey: ['therapist', 'me'],
    queryFn: () => getTherapist(user!.id),
    enabled: !!user,
  });
  const consultEnabled = myProfile?.consultEnabled ?? false;

  // Create mode specific state
  const [formKey, setFormKey] = useState(0);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [initialCreateValues, setInitialCreateValues] = useState<Partial<TherapyPlanFormValues> | undefined>(undefined);
  const [currentType, setCurrentType] = useState<TherapyPlanType>('PERSONAL_CONSULT');

  // Save-as-template state
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templatePublic, setTemplatePublic] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const { data: plan, isLoading } = useQuery({
    queryKey: ['therapy-plan', id],
    queryFn: () => getTherapyPlan(id!),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['therapy-plan', id] });
    queryClient.invalidateQueries({ queryKey: ['therapy-plans'] });
  };

  const addImageMutation = useMutation({
    mutationFn: (file: File) => addTherapyPlanImage(id!, file),
    onSuccess: () => { setGalleryError(null); invalidate(); },
    onError: (err: any) => {
      setGalleryError(err?.response?.data?.message ?? t('common.errors.generic', 'Upload failed'));
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) => deleteTherapyPlanImage(id!, imageId),
    onSuccess: invalidate,
  });

  const addPdfMutation = useMutation({
    mutationFn: (file: File) => addTherapyPlanPdf(id!, file),
    onSuccess: invalidate,
  });

  const deletePdfMutation = useMutation({
    mutationFn: (pdfId: string) => deleteTherapyPlanPdf(id!, pdfId),
    onSuccess: invalidate,
  });

  const saveTemplateMutation = useMutation({
    mutationFn: () => saveTherapyPlanAsTemplate(id!, { name: templateName, isPublic: templatePublic }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapyPlanTemplates'] });
      setTemplateSaved(true);
      setTemplateError(null);
      setSaveTemplateOpen(false);
      setTemplateName('');
      setTemplatePublic(false);
    },
    onError: (err: any) => {
      setTemplateError(err?.response?.data?.message ?? t('common.errors.generic', 'An error occurred'));
    },
  });

  const closeSignupMutation = useMutation({ mutationFn: () => closeTherapyPlanSignup(id!), onSuccess: invalidate });
  const startMutation = useMutation({ mutationFn: () => startTherapyPlan(id!), onSuccess: invalidate });
  const finishMutation = useMutation({ mutationFn: () => finishTherapyPlan(id!), onSuccess: invalidate });
  const toGalleryMutation = useMutation({ mutationFn: () => moveTherapyPlanToGallery(id!), onSuccess: invalidate });
  const cancelPlanMutation = useMutation({ mutationFn: () => cancelTherapyPlan(id!), onSuccess: invalidate });

  const runLifecycle = async (fn: () => Promise<any>) => {
    setLifecycleError(null);
    try { await fn(); } catch (err: any) {
      setLifecycleError(err?.response?.data?.message ?? t('common.errors.generic', 'An error occurred'));
    }
  };

  const handleTemplateSelect = (template: TherapyPlanTemplate) => {
    const data = template.data as Partial<TherapyPlanFormValues>;
    setInitialCreateValues({ ...data, events: [] });
    setCurrentType(template.type);
    setFormKey((k) => k + 1);
  };

  // ── Auto-save: called before each step advance ────────────────────────────

  const buildMetadataPayload = (values: TherapyPlanFormValues) => ({
    type: values.type,
    title: values.title,
    slogan: values.slogan || undefined,
    introduction: values.introduction,
    startTime: values.startTime ? new Date(values.startTime).toISOString() : new Date().toISOString(),
    endTime: values.endTime ? new Date(values.endTime).toISOString() : undefined,
    location: values.location,
    maxParticipants: values.maxParticipants ? parseInt(values.maxParticipants, 10) : null,
    contactInfo: values.contactInfo,
    artSalonSubType: (values.artSalonSubType || null) as any,
    sessionMedium: (values.sessionMedium || null) as any,
    defaultPosterId: values.poster?.type === 'default' ? values.poster.id : null,
    posterUrl: values.poster?.type === 'custom' ? values.poster.url : null,
    price: values.price ? parseFloat(values.price) : null,
  });

  const handleBeforeStepChange = async (fromStep: number, payload: StepChangePayload) => {
    const { values, posterFile, videoFile, galleryFiles, pdfFiles } = payload;
    setSaveError(null);
    try {
    if (fromStep === 1) {
      // ── Step 1 → 2: save metadata ───────────────────────────────────────
      const metaPayload = buildMetadataPayload(values);

      if (isCreateMode && !autoSavePlanId) {
        // First time: create the DRAFT
        const created = await createTherapyPlan(metaPayload as any);
        setAutoSavePlanId(created.id);
        // Upload poster immediately if selected
        if (posterFile) {
          await uploadTherapyPlanPoster(created.id, posterFile);
        }
      } else if (isCreateMode && autoSavePlanId) {
        await updateTherapyPlan(autoSavePlanId, metaPayload);
        if (posterFile) {
          await uploadTherapyPlanPoster(autoSavePlanId, posterFile);
        }
      } else {
        // Edit mode
        await updateTherapyPlan(id!, metaPayload);
        if (posterFile) {
          await uploadTherapyPlanPoster(id!, posterFile);
        }
        invalidate();
      }
    } else if (fromStep === 2) {
      // ── Step 2 → 3: save schedule ────────────────────────────────────────
      const pid = isCreateMode ? autoSavePlanId! : id!;
      await updateTherapyPlan(pid, {
        startTime: values.startTime ? new Date(values.startTime).toISOString() : undefined,
        endTime: values.endTime ? new Date(values.endTime).toISOString() : undefined,
      });
      if (values.events.length > 0) {
        await upsertTherapyPlanEvents(pid, { events: draftsToApiPayload(values.events) });
      }
      if (!isCreateMode) invalidate();
    } else if (fromStep === 3) {
      // ── Step 3 → 4: upload media files ───────────────────────────────────
      const pid = isCreateMode ? autoSavePlanId! : id!;
      setVideoUploadPercent(0);

      const uploads: Promise<any>[] = [];

      if (videoFile) {
        uploads.push(uploadTherapyPlanVideo(pid, videoFile, (pct) => setVideoUploadPercent(pct)));
      }
      if (galleryFiles.length > 0) {
        galleryFiles.forEach((file) => uploads.push(addTherapyPlanImage(pid, file)));
      }
      if (pdfFiles.length > 0) {
        pdfFiles.forEach((file) => uploads.push(addTherapyPlanPdf(pid, file)));
      }

      await Promise.all(uploads);
      if (!isCreateMode) invalidate();
    }
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? t('therapyPlans.form.submitError', 'Failed to save. Please try again.'));
      throw err; // re-throw so TherapyPlanForm does not advance the step
    }
  };

  // ── Step 4 actions ────────────────────────────────────────────────────────

  const handleSubmitForReview = async () => {
    setSaveError(null);
    const pid = isCreateMode ? autoSavePlanId! : id!;
    try {
      await submitTherapyPlanForReview(pid);
      navigate('/dashboard/therapist');
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? t('therapyPlans.form.submitError'));
      throw err; // re-throw so TherapyPlanForm keeps isSubmittingForReview=true on failure
    }
  };

  const handleSaveDraftAndExit = () => {
    navigate('/dashboard/therapist');
  };

  const handleExit = () => {
    navigate('/dashboard/therapist');
  };

  // ── Access checks ─────────────────────────────────────────────────────────

  if (!isCreateMode && isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!isCreateMode && !plan) return <div className="text-center py-16 text-stone-500">{t('therapyPlans.detail.notFound')}</div>;

  const isOwner = isCreateMode ? true : plan?.therapist?.userId === user?.id;
  const isAdmin = user?.role === 'ADMIN';
  const isTherapist = user?.role === 'THERAPIST';

  const canEdit = isCreateMode ||
    isAdmin ||
    (isOwner && plan && ['DRAFT', 'REJECTED', 'IN_GALLERY'].includes(plan.status));

  // Submit for review: create mode (after first auto-save creates the plan) or edit DRAFT/REJECTED
  const canSubmitForReview =
    (isCreateMode) ||
    (!isCreateMode && isTherapist && isOwner && plan && ['DRAFT', 'REJECTED'].includes(plan.status));

  const isNonPersonal = isCreateMode ? currentType !== 'PERSONAL_CONSULT' : plan?.type !== 'PERSONAL_CONSULT';
  const activeStatuses = ['PUBLISHED', 'SIGN_UP_CLOSED', 'IN_PROGRESS'];

  const isLifecycleBusy =
    closeSignupMutation.isPending || startMutation.isPending ||
    finishMutation.isPending || toGalleryMutation.isPending || cancelPlanMutation.isPending;

  // The planId to show in the form (edit mode has `id`; create mode gets it after first auto-save)
  const effectivePlanId = isCreateMode ? (autoSavePlanId ?? undefined) : id;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-stone-900">
          {isCreateMode ? t('therapyPlans.form.createTitle') : t('therapyPlans.form.editTitle')}
        </h1>
        <div className="flex items-center gap-2">
          {isCreateMode ? (
            <Button variant="outline" size="sm" onClick={() => setTemplateModalOpen(true)}>
              {t('therapyPlans.templates.loadTemplate')}
            </Button>
          ) : (
            <>
              {(isOwner || isAdmin) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSaveTemplateOpen((v) => !v);
                    setTemplateSaved(false);
                    setTemplateError(null);
                  }}
                >
                  {t('therapyPlans.templates.saveAsTemplate')}
                </Button>
              )}
              {plan && (
                <Badge variant={statusVariant[plan.status] ?? 'default'}>
                  {t(`common.planStatus.${plan.status}`)}
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

      <TemplatePickerModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        planType={currentType}
        onSelect={handleTemplateSelect}
      />

      {/* Save as template inline form */}
      {!isCreateMode && saveTemplateOpen && plan && (
        <div className="mb-6 rounded-lg border border-stone-200 bg-stone-50 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-stone-700">
            {t('therapyPlans.templates.saveAsTemplate')}
          </h3>
          {templateSaved && (
            <p className="text-sm text-teal-600">{t('therapyPlans.templates.saved')}</p>
          )}
          {templateError && (
            <p className="text-sm text-rose-600">{templateError}</p>
          )}
          <Input
            label={t('therapyPlans.templates.templateName')}
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            maxLength={100}
            placeholder={plan.title}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={templatePublic}
              onChange={(e) => setTemplatePublic(e.target.checked)}
              className="rounded border-stone-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-stone-700">
              {t('therapyPlans.templates.makePublic')}
            </span>
          </label>
          <div className="flex gap-2">
            <Button
              size="sm"
              loading={saveTemplateMutation.isPending}
              disabled={!templateName.trim() || saveTemplateMutation.isPending}
              onClick={() => saveTemplateMutation.mutate()}
            >
              {t('common.save', 'Save')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSaveTemplateOpen(false)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
          </div>
        </div>
      )}

      {canEdit ? (
        <TherapyPlanForm
          key={formKey}
          initialValues={isCreateMode ? initialCreateValues : (plan ? planToFormValues(plan) : undefined)}
          planId={effectivePlanId}
          onBeforeStepChange={handleBeforeStepChange}
          onSubmitForReview={canSubmitForReview ? handleSubmitForReview : undefined}
          onSaveDraftAndExit={handleSaveDraftAndExit}
          onExit={handleExit}
          error={saveError}
          rejectionReason={plan?.status === 'REJECTED' ? plan.rejectionReason : null}
          existingVideoUrl={plan?.videoUrl}
          galleryImages={plan?.images ?? []}
          onAddGalleryImage={!isCreateMode ? (file) => addImageMutation.mutate(file) : undefined}
          onDeleteGalleryImage={!isCreateMode ? (imageId) => deleteImageMutation.mutate(imageId) : undefined}
          isAddingGalleryImage={addImageMutation.isPending}
          galleryUploadError={galleryError}
          existingPdfs={plan?.pdfs ?? []}
          onAddPdf={!isCreateMode ? (file) => addPdfMutation.mutate(file) : undefined}
          onDeletePdf={!isCreateMode ? (pdfId) => deletePdfMutation.mutate(pdfId) : undefined}
          isAddingPdf={addPdfMutation.isPending}
          videoUploadPercent={videoUploadPercent}
          consultEnabled={consultEnabled}
        />
      ) : plan ? (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-700">
              {plan.status === 'PENDING_REVIEW'
                ? t('therapyPlans.detail.pendingBanner')
                : t('therapyPlans.detail.publishedBanner')}
            </p>
          </div>

          {/* Gallery management is always available to the owner/admin */}
          {(isOwner || isAdmin) && (
            <div className="mb-6 space-y-3">
              <p className="text-sm font-medium text-stone-700">
                {t('therapyPlans.form.gallerySection', 'Gallery Images (up to 9)')}
              </p>
              <div className="flex flex-wrap gap-2">
                {(plan.images ?? []).map((img) => (
                  <div key={img.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-stone-200">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => deleteImageMutation.mutate(img.id)}
                      className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5 text-white hover:bg-rose-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {(plan.images ?? []).length < 9 && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      id="gallery-upload-readonly"
                      disabled={addImageMutation.isPending}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        addImageMutation.mutate(file);
                        e.target.value = '';
                      }}
                    />
                    <label
                      htmlFor="gallery-upload-readonly"
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                    >
                      {addImageMutation.isPending
                        ? <span className="text-xs text-center leading-tight">{t('common.uploading', 'Uploading…')}</span>
                        : <span className="text-xs text-center">{t('therapyPlans.form.addImage', 'Add')}</span>
                      }
                    </label>
                  </>
                )}
              </div>
              {galleryError && <p className="text-xs text-rose-600">{galleryError}</p>}
            </div>
          )}
        </>
      ) : null}

      {/* Lifecycle actions */}
      {!isCreateMode && plan && (isOwner || isAdmin) && (
        <div className="mt-6 pt-6 border-t border-stone-100 space-y-3">
          {lifecycleError && (
            <p className="text-sm text-rose-600">{lifecycleError}</p>
          )}
          <div className="flex flex-wrap gap-3">
            {plan.status === 'PUBLISHED' && isNonPersonal && isOwner && (
              <Button
                variant="outline"
                loading={closeSignupMutation.isPending}
                disabled={isLifecycleBusy}
                onClick={() => runLifecycle(() => closeSignupMutation.mutateAsync())}
              >
                {t('therapyPlans.detail.closeSignup')}
              </Button>
            )}
            {plan.status === 'SIGN_UP_CLOSED' && isOwner && (
              <Button
                loading={startMutation.isPending}
                disabled={isLifecycleBusy}
                onClick={() => runLifecycle(() => startMutation.mutateAsync())}
              >
                {t('therapyPlans.detail.startSession')}
              </Button>
            )}
            {plan.status === 'IN_PROGRESS' && isOwner && (
              <Button
                loading={finishMutation.isPending}
                disabled={isLifecycleBusy}
                onClick={() => runLifecycle(() => finishMutation.mutateAsync())}
              >
                {t('therapyPlans.detail.finishSession')}
              </Button>
            )}
            {plan.status === 'FINISHED' && isOwner && (
              <Button
                loading={toGalleryMutation.isPending}
                disabled={isLifecycleBusy}
                onClick={() => runLifecycle(() => toGalleryMutation.mutateAsync())}
              >
                {t('therapyPlans.detail.moveToGallery')}
              </Button>
            )}
            {activeStatuses.includes(plan.status) && (isOwner || isAdmin) && (
              <Button
                variant="danger"
                loading={cancelPlanMutation.isPending}
                disabled={isLifecycleBusy}
                onClick={() => runLifecycle(() => cancelPlanMutation.mutateAsync())}
              >
                {t('therapyPlans.detail.cancelPlan')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
