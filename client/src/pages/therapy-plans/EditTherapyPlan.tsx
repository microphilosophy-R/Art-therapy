import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTherapyPlan,
  updateTherapyPlan,
  uploadTherapyPlanPoster,
  submitTherapyPlanForReview,
} from '../../api/therapyPlans';
import { TherapyPlanForm, planToFormValues, type TherapyPlanFormValues } from './TherapyPlanForm';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'> = {
  DRAFT: 'outline',
  PENDING_REVIEW: 'warning',
  PUBLISHED: 'success',
  REJECTED: 'danger',
  ARCHIVED: 'default',
};

export const EditTherapyPlan = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { data: plan, isLoading } = useQuery({
    queryKey: ['therapy-plan', id],
    queryFn: () => getTherapyPlan(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ payload }: { payload: any }) => updateTherapyPlan(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapy-plan', id] });
      queryClient.invalidateQueries({ queryKey: ['therapy-plans'] });
    },
  });

  const posterMutation = useMutation({
    mutationFn: (file: File) => uploadTherapyPlanPoster(id!, file),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitTherapyPlanForReview(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapy-plan', id] });
      queryClient.invalidateQueries({ queryKey: ['therapy-plans'] });
      setSubmitSuccess(true);
    },
  });

  const handleSubmit = async (values: TherapyPlanFormValues, posterFile: File | null) => {
    setSaveError(null);
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

  const canEdit =
    user?.role === 'ADMIN' ||
    ((plan.status === 'DRAFT' || plan.status === 'REJECTED') &&
      plan.therapist?.userId === user?.id);

  const canSubmit =
    user?.role === 'THERAPIST' &&
    plan.therapist?.userId === user?.id &&
    (plan.status === 'DRAFT' || plan.status === 'REJECTED') &&
    !submitSuccess;

  const isSaving = updateMutation.isPending || posterMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-900">{t('therapyPlans.form.editTitle')}</h1>
        <Badge variant={statusVariant[plan.status] ?? 'default'}>
          {t(`common.planStatus.${plan.status}`)}
        </Badge>
      </div>

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
        />
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-700">
            {plan.status === 'PENDING_REVIEW'
              ? t('therapyPlans.detail.pendingBanner')
              : t('therapyPlans.detail.publishedBanner')}
          </p>
        </div>
      )}

      {canSubmit && !submitSuccess && (
        <div className="mt-6 pt-6 border-t border-stone-100">
          {submitError && (
            <p className="text-sm text-rose-600 mb-3">{submitError}</p>
          )}
          <Button
            onClick={handleSubmitForReview}
            loading={submitMutation.isPending}
            disabled={submitMutation.isPending}
          >
            {t('therapyPlans.detail.submitForReview')}
          </Button>
        </div>
      )}
    </div>
  );
};
