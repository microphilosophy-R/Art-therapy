import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTherapyPlan,
  updateTherapyPlan,
  uploadTherapyPlanPoster,
  uploadTherapyPlanVideo,
  addTherapyPlanImage,
  deleteTherapyPlanImage,
  uploadTherapyPlanAttachment,
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
import { TherapyPlanForm, planToFormValues, type TherapyPlanFormValues } from './TherapyPlanForm';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Input } from '../../components/ui/Input';
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [videoUploadPercent, setVideoUploadPercent] = useState(0);

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

  const updateMutation = useMutation({
    mutationFn: ({ payload }: { payload: any }) => updateTherapyPlan(id!, payload),
    onSuccess: invalidate,
  });

  const posterMutation = useMutation({
    mutationFn: (file: File) => uploadTherapyPlanPoster(id!, file),
  });

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

  const attachmentMutation = useMutation({
    mutationFn: (file: File) => uploadTherapyPlanAttachment(id!, file),
    onSuccess: invalidate,
  });

  const submitMutation = useMutation({
    mutationFn: () => submitTherapyPlanForReview(id!),
    onSuccess: () => { invalidate(); setSubmitSuccess(true); },
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

  const closeSignupMutation  = useMutation({ mutationFn: () => closeTherapyPlanSignup(id!),  onSuccess: invalidate });
  const startMutation        = useMutation({ mutationFn: () => startTherapyPlan(id!),        onSuccess: invalidate });
  const finishMutation       = useMutation({ mutationFn: () => finishTherapyPlan(id!),       onSuccess: invalidate });
  const toGalleryMutation    = useMutation({ mutationFn: () => moveTherapyPlanToGallery(id!), onSuccess: invalidate });
  const cancelPlanMutation   = useMutation({ mutationFn: () => cancelTherapyPlan(id!),       onSuccess: invalidate });

  const runLifecycle = async (fn: () => Promise<any>) => {
    setLifecycleError(null);
    try { await fn(); } catch (err: any) {
      setLifecycleError(err?.response?.data?.message ?? t('common.errors.generic', 'An error occurred'));
    }
  };

  const handleSubmit = async (values: TherapyPlanFormValues, posterFile: File | null, videoFile: File | null) => {
    setSaveError(null);
    setVideoUploadPercent(0);
    try {
      await updateMutation.mutateAsync({
        payload: {
          type: values.type,
          title: values.title,
          slogan: values.slogan || null,
          introduction: values.introduction,
          startTime: new Date(values.startTime).toISOString(),
          endTime: values.endTime ? new Date(values.endTime).toISOString() : null,
          location: values.location,
          maxParticipants: values.maxParticipants ? parseInt(values.maxParticipants, 10) : null,
          price: values.price ? parseFloat(values.price) : null,
          contactInfo: values.contactInfo,
          artSalonSubType: (values.artSalonSubType || null) as any,
          sessionMedium: (values.sessionMedium || null) as any,
          defaultPosterId: values.poster?.type === 'default' ? values.poster.id : null,
          posterUrl: values.poster?.type === 'custom' && !posterFile ? values.poster.url : null,
        },
      });

      if (posterFile) {
        await posterMutation.mutateAsync(posterFile);
      }

      if (videoFile) {
        await uploadTherapyPlanVideo(id!, videoFile, (pct) => setVideoUploadPercent(pct));
      }

      if (values.events.length > 0) {
        await upsertTherapyPlanEvents(id!, {
          events: draftsToApiPayload(values.events),
        });
      }
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? t('therapyPlans.form.submitError'));
    }
  };

  const handleSubmitForReview = async () => {
    setSubmitError(null);
    try {
      await submitMutation.mutateAsync();
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message ?? t('therapyPlans.form.submitError'));
    }
  };

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!plan) return <div className="text-center py-16 text-stone-500">{t('therapyPlans.detail.notFound')}</div>;

  const isOwner = plan.therapist?.userId === user?.id;
  const isAdmin = user?.role === 'ADMIN';
  const isTherapist = user?.role === 'THERAPIST';

  const canEdit =
    isAdmin ||
    (isOwner && ['DRAFT', 'REJECTED', 'IN_GALLERY'].includes(plan.status));

  const canSubmit = isTherapist && isOwner && ['DRAFT', 'REJECTED'].includes(plan.status) && !submitSuccess;

  const isNonPersonal = plan.type !== 'PERSONAL_CONSULT';
  const activeStatuses = ['PUBLISHED', 'SIGN_UP_CLOSED', 'IN_PROGRESS'];

  const isSaving = updateMutation.isPending || posterMutation.isPending || attachmentMutation.isPending;
  const isLifecycleBusy =
    closeSignupMutation.isPending || startMutation.isPending ||
    finishMutation.isPending || toGalleryMutation.isPending || cancelPlanMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-stone-900">{t('therapyPlans.form.editTitle')}</h1>
        <div className="flex items-center gap-2">
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
          <Badge variant={statusVariant[plan.status] ?? 'default'}>
            {t(`common.planStatus.${plan.status}`)}
          </Badge>
        </div>
      </div>

      {/* Save as template inline form */}
      {saveTemplateOpen && (
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

      {/* Submit for review success */}
      {submitSuccess && (
        <div className="mb-6 bg-teal-50 border border-teal-200 rounded-lg p-4">
          <p className="text-sm text-teal-700 font-medium">{t('therapyPlans.detail.pendingBanner')}</p>
        </div>
      )}

      {canEdit ? (
        <TherapyPlanForm
          initialValues={planToFormValues(plan)}
          onSubmit={handleSubmit}
          submitLabel={t('therapyPlans.form.saveChanges')}
          isLoading={isSaving}
          error={saveError}
          rejectionReason={plan.status === 'REJECTED' ? plan.rejectionReason : null}
          existingVideoUrl={plan.videoUrl}
          existingAttachmentUrl={plan.attachmentUrl}
          existingAttachmentName={plan.attachmentName}
          galleryImages={plan.images ?? []}
          onAddGalleryImage={(file) => addImageMutation.mutate(file)}
          onDeleteGalleryImage={(imageId) => deleteImageMutation.mutate(imageId)}
          isAddingGalleryImage={addImageMutation.isPending}
          galleryUploadError={galleryError}
          onAttachmentFileChange={(file) => { if (file) attachmentMutation.mutate(file); }}
          videoUploadPercent={videoUploadPercent}
          secondaryAction={canSubmit ? (
            <>
              {submitError && (
                <span className="text-sm text-rose-600">{submitError}</span>
              )}
              <Button
                variant="outline"
                type="button"
                onClick={handleSubmitForReview}
                loading={submitMutation.isPending}
                disabled={submitMutation.isPending}
              >
                {t('therapyPlans.detail.submitForReview')}
              </Button>
            </>
          ) : undefined}
        />
      ) : (
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
      )}

      {/* Lifecycle actions */}
      {(isOwner || isAdmin) && (
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
