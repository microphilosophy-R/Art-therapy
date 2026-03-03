import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import { getMyProfile, updateProfileStep } from '../../../api/userProfile';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Step1SystemMetadata } from './profile-steps/Step1SystemMetadata';
import { Step2PrivateMetadata } from './profile-steps/Step2PrivateMetadata';
import { Step3PublicProfile } from './profile-steps/Step3PublicProfile';
import { Step4CalendarVisibility } from './profile-steps/Step4CalendarVisibility';
import { Step5Showcase } from './profile-steps/Step5Showcase';
import { Step6PreviewSubmit } from './profile-steps/Step6PreviewSubmit';

const STEPS = ['System Info', 'Private Data', 'Public Profile', 'Calendar', 'Showcase', 'Preview'] as const;

export const UnifiedProfileTab = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile', 'me'],
    queryFn: getMyProfile,
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => updateProfileStep(step + 1, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['userProfile', 'me'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => (
          <React.Fragment key={i}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                i === step ? 'bg-teal-50 text-teal-700' : i < step ? 'text-teal-600 hover:bg-stone-50' : 'text-stone-400 hover:bg-stone-50'
              }`}
            >
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold ${
                i < step ? 'bg-teal-600 text-white' : i === step ? 'bg-teal-100 text-teal-700' : 'bg-stone-100 text-stone-400'
              }`}>
                {i < step ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-stone-200 mx-1" />}
          </React.Fragment>
        ))}
      </div>

      {saved && (
        <div className="flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-3 rounded-xl border border-teal-100 mb-4">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Saved</span>
        </div>
      )}

      {step === 0 && <Step1SystemMetadata profile={profile} />}
      {step === 1 && <Step2PrivateMetadata profile={profile} onSave={saveMutation.mutate} />}
      {step === 2 && <Step3PublicProfile profile={profile} onSave={saveMutation.mutate} />}
      {step === 3 && <Step4CalendarVisibility profile={profile} onSave={saveMutation.mutate} />}
      {step === 4 && <Step5Showcase profile={profile} onSave={saveMutation.mutate} />}
      {step === 5 && <Step6PreviewSubmit profile={profile} />}

      {step < 5 && (
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-stone-100">
          <Button type="button" variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
            {t('common.back')}
          </Button>
          <Button type="button" onClick={() => setStep(s => Math.min(5, s + 1))}>
            {t('common.next')}
          </Button>
        </div>
      )}

      {step === 5 && (
        <div className="flex justify-start mt-6">
          <Button type="button" variant="outline" onClick={() => setStep(4)}>
            {t('common.back')}
          </Button>
        </div>
      )}
    </div>
  );
};
