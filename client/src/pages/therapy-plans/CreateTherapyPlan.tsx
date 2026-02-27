import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { createTherapyPlan, uploadTherapyPlanPoster, upsertTherapyPlanEvents } from '../../api/therapyPlans';
import { draftsToApiPayload } from '../../components/therapyPlans/PlanSchedule';
import { TherapyPlanForm, type TherapyPlanFormValues } from './TherapyPlanForm';
import { Button } from '../../components/ui/Button';
import { TemplatePickerModal } from '../../components/therapyPlans/TemplatePickerModal';
import type { TherapyPlanTemplate, TherapyPlanType } from '../../types';

export const CreateTherapyPlan = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [initialValues, setInitialValues] = useState<Partial<TherapyPlanFormValues> | undefined>(undefined);
  const [currentType, setCurrentType] = useState<TherapyPlanType>('PERSONAL_CONSULT');

  const createMutation = useMutation({ mutationFn: createTherapyPlan });
  const posterMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadTherapyPlanPoster(id, file)
  });

  const handleSubmit = async (values: TherapyPlanFormValues, posterFile: File | null) => {
    setError(null);
    try {
      const plan = await createMutation.mutateAsync({
        type: values.type,
        title: values.title,
        slogan: values.slogan || undefined,
        introduction: values.introduction,
        startTime: new Date(values.startTime).toISOString(),
        endTime: values.endTime ? new Date(values.endTime).toISOString() : undefined,
        location: values.location,
        maxParticipants: values.maxParticipants ? parseInt(values.maxParticipants, 10) : null,
        contactInfo: values.contactInfo,
        artSalonSubType: (values.artSalonSubType || null) as any,
        sessionMedium: (values.sessionMedium || null) as any,
        defaultPosterId: values.poster?.type === 'default' ? values.poster.id : null,
        posterUrl: null,
      });

      if (posterFile) {
        await posterMutation.mutateAsync({ id: plan.id, file: posterFile });
      }

      if (values.events.length > 0) {
        await upsertTherapyPlanEvents(plan.id, {
          events: draftsToApiPayload(values.events),
        });
      }

      navigate(`/therapy-plans/${plan.id}/edit`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('therapyPlans.form.submitError'));
    }
  };

  const handleTemplateSelect = (template: TherapyPlanTemplate) => {
    const data = template.data as Partial<TherapyPlanFormValues>;
    setInitialValues({ ...data, events: [] });
    setCurrentType(template.type);
    setFormKey((k) => k + 1);
  };

  const isLoading = createMutation.isPending || posterMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-900">{t('therapyPlans.form.createTitle')}</h1>
        <Button variant="outline" size="sm" onClick={() => setTemplateModalOpen(true)}>
          {t('therapyPlans.templates.loadTemplate')}
        </Button>
      </div>

      <TemplatePickerModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        planType={currentType}
        onSelect={handleTemplateSelect}
      />

      <TherapyPlanForm
        key={formKey}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        submitLabel={t('therapyPlans.form.saveDraft')}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
};
