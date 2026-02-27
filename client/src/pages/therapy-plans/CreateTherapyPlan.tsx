import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { createTherapyPlan, uploadTherapyPlanPoster } from '../../api/therapyPlans';
import { TherapyPlanForm, type TherapyPlanFormValues } from './TherapyPlanForm';

export const CreateTherapyPlan = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({ mutationFn: createTherapyPlan });
  const posterMutation = useMutation({ mutationFn: ({ id, file }: { id: string; file: File }) =>
    uploadTherapyPlanPoster(id, file) });

  const handleSubmit = async (values: TherapyPlanFormValues, posterFile: File | null) => {
    setError(null);
    try {
      const plan = await createMutation.mutateAsync({
        type:            values.type,
        title:           values.title,
        introduction:    values.introduction,
        startTime:       new Date(values.startTime).toISOString(),
        endTime:         values.endTime ? new Date(values.endTime).toISOString() : undefined,
        location:        values.location,
        maxParticipants: values.maxParticipants ? parseInt(values.maxParticipants, 10) : null,
        contactInfo:     values.contactInfo,
        artSalonSubType: (values.artSalonSubType || null) as any,
        sessionMedium:   (values.sessionMedium || null) as any,
        defaultPosterId: values.poster?.type === 'default' ? values.poster.id : null,
        posterUrl:       null,
      });

      // Upload custom poster if selected
      if (posterFile) {
        await posterMutation.mutateAsync({ id: plan.id, file: posterFile });
      }

      navigate(`/therapy-plans/${plan.id}/edit`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('therapyPlans.form.submitError'));
    }
  };

  const isLoading = createMutation.isPending || posterMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">{t('therapyPlans.form.createTitle')}</h1>
      <TherapyPlanForm
        onSubmit={handleSubmit}
        submitLabel={t('therapyPlans.form.saveDraft')}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
};
