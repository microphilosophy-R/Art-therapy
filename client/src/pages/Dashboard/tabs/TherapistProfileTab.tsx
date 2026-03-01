import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import { getTherapist, updateTherapistProfile } from '../../../api/therapists';
import { updateProfileSchema, type UpdateProfileInput } from '../../../../../server/src/schemas/therapist.schemas';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Step1BasicInfo } from './profile-steps/Step1BasicInfo';
import { Step2ConsultSetup } from './profile-steps/Step2ConsultSetup';
import { Step3Media } from './profile-steps/Step3Media';
import { Step4Preview } from './profile-steps/Step4Preview';

const STEPS = ['profile.wizard.step1', 'profile.wizard.step2', 'profile.wizard.step3', 'profile.wizard.step4'] as const;

export const TherapistProfileTab = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['therapist', 'me'],
    queryFn: () => getTherapist(user!.id),
    enabled: !!user,
  });

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      bio: '',
      specialties: [],
      sessionPrice: 0,
      sessionLength: 60,
      locationCity: '',
      isAccepting: true,
      featuredImageUrl: '',
      socialMediaLink: '',
      qrCodeUrl: '',
      consultEnabled: false,
      certificateUrl: '',
      hourlyConsultFee: null,
    },
    values: profile
      ? {
          bio: profile.bio ?? '',
          specialties: profile.specialties ?? [],
          sessionPrice: Number(profile.sessionPrice),
          sessionLength: profile.sessionLength,
          locationCity: profile.locationCity ?? '',
          isAccepting: profile.isAccepting,
          featuredImageUrl: profile.featuredImageUrl ?? '',
          socialMediaLink: profile.socialMediaLink ?? '',
          qrCodeUrl: profile.qrCodeUrl ?? '',
          consultEnabled: profile.consultEnabled ?? false,
          certificateUrl: profile.certificateUrl ?? '',
          hourlyConsultFee: profile.hourlyConsultFee != null ? Number(profile.hourlyConsultFee) : null,
        }
      : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: (data: UpdateProfileInput) =>
      updateTherapistProfile(profile?.id ?? user!.id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['therapist', 'me'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (profile?.id !== updated.id) window.location.reload();
    },
  });

  const handleSaveAndNext = form.handleSubmit((data) => {
    saveMutation.mutate(data, {
      onSuccess: () => {
        if (step < STEPS.length - 1) setStep((s) => s + 1);
      },
    });
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((key, i) => (
          <React.Fragment key={key}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                i === step
                  ? 'bg-teal-50 text-teal-700'
                  : i < step
                  ? 'text-teal-600 hover:bg-stone-50'
                  : 'text-stone-400 hover:bg-stone-50'
              }`}
            >
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold ${
                i < step ? 'bg-teal-600 text-white' : i === step ? 'bg-teal-100 text-teal-700' : 'bg-stone-100 text-stone-400'
              }`}>
                {i < step ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{t(key)}</span>
            </button>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-stone-200 mx-1" />}
          </React.Fragment>
        ))}
      </div>

      {saved && (
        <div className="flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-3 rounded-xl border border-teal-100 mb-4 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{t('therapists.profile.saveSuccess')}</span>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()}>
        {step === 0 && <Step1BasicInfo form={form} />}
        {step === 1 && <Step2ConsultSetup form={form} />}
        {step === 2 && profile && <Step3Media form={form} profile={profile} />}
        {step === 3 && profile && <Step4Preview profile={profile} />}

        {step < 3 && (
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-stone-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              {t('common.back')}
            </Button>
            <Button
              type="button"
              onClick={handleSaveAndNext}
              loading={saveMutation.isPending}
            >
              {step === 2 ? t('common.save') : t('common.next')}
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="flex justify-start mt-6">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              {t('common.back')}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};
